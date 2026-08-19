"""Repository SQL construction.

The service-level suites fake the repositories, which means the SQL itself had
no coverage at all. These tests exercise the parts that take request data and
turn it into a query — the sort field and the patch keys — because those are
the only places an identifier reaches SQL, and an identifier cannot be a bound
parameter.

A fake cursor stands in for the database: these assert what SQL is built, not
what Postgres does with it.
"""
from contextlib import contextmanager
from typing import Any

import pytest

from app.core.errors import NotFoundError
from app.repositories import collectibles_repo, designs_repo

USER = "11111111-1111-4111-8111-111111111111"
DESIGN = "33333333-3333-4333-8333-333333333333"


class FakeCursor:
    def __init__(self) -> None:
        self.rows: list[dict[str, Any]] = []
        self.executed: list[tuple[str, Any]] = []

    def execute(self, query: Any, params: Any = None) -> None:
        text = query.as_string(None) if hasattr(query, "as_string") else str(query)
        self.executed.append((text, params))

    def fetchall(self) -> list[dict[str, Any]]:
        return self.rows

    def fetchone(self) -> dict[str, Any] | None:
        return self.rows[0] if self.rows else None

    @property
    def sql(self) -> str:
        assert self.executed, "no query was executed"
        return self.executed[-1][0]

    @property
    def params(self) -> Any:
        assert self.executed, "no query was executed"
        return self.executed[-1][1]


@pytest.fixture
def cur(monkeypatch) -> FakeCursor:
    fake = FakeCursor()

    @contextmanager
    def _cursor():
        yield fake

    monkeypatch.setattr(designs_repo, "cursor", _cursor)
    monkeypatch.setattr(collectibles_repo, "cursor", _cursor)
    return fake


@pytest.fixture
def designs() -> designs_repo.DesignsRepository:
    return designs_repo.DesignsRepository()


# --- sorting ---------------------------------------------------------------


def test_sort_field_is_quoted_not_interpolated(cur, designs):
    designs.list_for_user(USER, sort="name")
    assert 'ORDER BY "name" ASC' in cur.sql


def test_leading_dash_sorts_descending(cur, designs):
    designs.list_for_user(USER, sort="-name")
    assert 'ORDER BY "name" DESC' in cur.sql


def test_unknown_sort_field_falls_back(cur, designs):
    """An unrecognised field must not reach SQL, even quoted."""
    designs.list_for_user(USER, sort="password")
    assert 'ORDER BY "created_date" DESC' in cur.sql
    assert "password" not in cur.sql


def test_sort_injection_attempt_falls_back(cur, designs):
    designs.list_for_user(USER, sort="created_date; DROP TABLE crayon_designs")
    assert 'ORDER BY "created_date" DESC' in cur.sql
    assert "DROP TABLE" not in cur.sql


# --- scoping ---------------------------------------------------------------


def test_list_is_scoped_to_the_user(cur, designs):
    designs.list_for_user(USER)
    assert "WHERE user_id = %(user_id)s" in cur.sql
    assert str(cur.params["user_id"]) == USER


def test_update_is_scoped_to_the_user(cur, designs):
    cur.rows = [{"id": DESIGN}]
    designs.update(DESIGN, USER, {"name": "Sunset"})
    assert "WHERE id = %(id)s AND user_id = %(user_id)s" in cur.sql


def test_delete_is_scoped_to_the_user(cur, designs):
    cur.rows = [{"id": DESIGN}]
    designs.delete(DESIGN, USER)
    assert "WHERE id = %(id)s AND user_id = %(user_id)s" in cur.sql


# --- malformed ids ---------------------------------------------------------


def test_malformed_id_is_not_found_rather_than_an_error(cur, designs):
    """Postgres would raise `invalid input syntax for type uuid` — a 500 for
    what is really a bad path parameter."""
    with pytest.raises(NotFoundError):
        designs.get("not-a-uuid", USER)
    assert not cur.executed, "a malformed id must never reach SQL"


# --- patching --------------------------------------------------------------


def test_update_ignores_columns_not_on_the_whitelist(cur, designs):
    cur.rows = [{"id": DESIGN}]
    designs.update(DESIGN, USER, {"name": "Sunset", "user_id": "someone-else"})
    assert '"name" = %(name)s' in cur.sql
    assert '"user_id" = ' not in cur.sql


def test_empty_patch_reads_instead_of_writing(cur, designs):
    cur.rows = [{"id": DESIGN}]
    designs.update(DESIGN, USER, {})
    assert cur.sql.startswith("SELECT")


def test_create_only_inserts_known_columns(cur, designs):
    cur.rows = [{"id": DESIGN}]
    designs.create(USER, {"name": "Sunset", "id": "attacker-chosen"})
    assert '"user_id"' in cur.sql
    assert '"name"' in cur.sql
    assert '"id"' not in cur.sql


def test_missing_row_on_update_is_not_found(cur, designs):
    cur.rows = []
    with pytest.raises(NotFoundError):
        designs.update(DESIGN, USER, {"name": "Sunset"})


# --- collectibles ----------------------------------------------------------


def test_add_collectible_is_idempotent(cur):
    """A repeat scan must succeed quietly, not collide with the unique index."""
    cur.rows = [{"id": "c1", "set_name": "Ocean", "crayon_name": "Coral"}]
    collectibles_repo.CollectiblesRepository().add(USER, "Ocean", "Coral")
    assert "ON CONFLICT (user_id, set_name, crayon_name)" in cur.sql
    assert "DO UPDATE" in cur.sql


def test_add_collectible_preserves_the_original_verified_at(cur):
    """verified_at records when it was FIRST earned, so the conflict branch
    must not touch it."""
    cur.rows = [{"id": "c1"}]
    collectibles_repo.CollectiblesRepository().add(USER, "Ocean", "Coral")
    assert "verified_at" not in cur.sql.split("DO UPDATE SET")[1].split("RETURNING")[0]


def test_collectibles_are_scoped_to_the_user(cur):
    collectibles_repo.CollectiblesRepository().list_for_user(USER)
    assert "WHERE user_id = %(user_id)s" in cur.sql
    assert str(cur.params["user_id"]) == USER
