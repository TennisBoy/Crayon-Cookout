"""The admin grant tool.

It exists so a comp does not require a payment. What it must never become is a
second way for the web app to grant entitlements: there is no endpoint here, and
every grant is labelled so a comp can be told from a sale.
"""
from unittest.mock import patch

import pytest

from app import admin
from app.services.entitlements_service import EntitlementsService
from tests.conftest import TEST_USER
from tests.test_entitlements import FakeEntitlementsRepository

EMAIL = "kid@example.com"


@pytest.fixture
def repo():
    return FakeEntitlementsRepository()


@pytest.fixture
def wired(repo, monkeypatch):
    monkeypatch.setattr(
        admin, "find_user", lambda email: TEST_USER.id if email == EMAIL else None
    )
    monkeypatch.setattr(admin, "EntitlementsService", lambda: EntitlementsService(repo))
    return repo


def test_grant_gives_the_whole_pass(wired, capsys):
    assert admin.main(["grant", "--email", EMAIL]) == 0
    assert sorted(r["feature"] for r in wired.rows) == ["colouring", "kitchen"]


def test_a_grant_is_recorded_as_a_grant_not_a_sale(wired):
    """A comp must never be indistinguishable from revenue."""
    admin.main(["grant", "--email", EMAIL])
    assert {r["source"] for r in wired.rows} == {"grant"}
    assert all(r["reference"] is None for r in wired.rows)


def test_a_single_feature_can_be_granted(wired):
    admin.main(["grant", "--email", EMAIL, "--feature", "kitchen"])
    assert [r["feature"] for r in wired.rows] == ["kitchen"]


def test_unknown_email_fails_loudly(wired, capsys):
    assert admin.main(["grant", "--email", "nobody@example.com"]) == 1
    assert wired.rows == []
    assert "no account" in capsys.readouterr().err


def test_list_reports_what_is_owned(wired, capsys):
    admin.main(["grant", "--email", EMAIL])
    admin.main(["list", "--email", EMAIL])
    assert "kitchen" in capsys.readouterr().out


def test_unknown_feature_is_rejected_by_the_parser(wired):
    with pytest.raises(SystemExit):
        admin.main(["grant", "--email", EMAIL, "--feature", "everything"])


def test_revoke_removes_the_rows(wired, capsys):
    admin.main(["grant", "--email", EMAIL])
    calls = {}

    class FakeCur:
        def execute(self, sql, params=None):
            calls["sql"] = sql
            wired.rows.clear()

        def fetchone(self):
            return None

    class FakeCtx:
        def __enter__(self):
            return FakeCur()

        def __exit__(self, *a):
            return False

    with patch.object(admin, "cursor", lambda: FakeCtx()):
        assert admin.main(["revoke", "--email", EMAIL]) == 0

    assert "delete from entitlements" in calls["sql"]
    assert wired.rows == []
