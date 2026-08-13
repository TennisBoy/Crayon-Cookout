"""Collectibles: the unlock must be gated on a real photo match."""
import io

import pytest

from app.api.routes.collectibles import get_collectibles_service
from app.core.errors import ServiceUnavailableError
from app.services.collectibles_service import CollectiblesService
from tests.conftest import TEST_USER


class FakeCollectiblesRepository:
    def __init__(self):
        self.rows: list[dict] = []

    def list_for_user(self, user_id):
        return [r for r in self.rows if r["user_id"] == user_id]

    def add(self, user_id, set_name, crayon_name):
        row = {"user_id": user_id, "set_name": set_name, "crayon_name": crayon_name}
        # Upsert semantics: re-scanning is a no-op, not a duplicate.
        if row not in self.rows:
            self.rows.append(row)
        return row


class FakeVision:
    def __init__(self, verdict=True, raises=None):
        self.verdict = verdict
        self.raises = raises
        self.calls = []

    def verify_crayon_photo(self, image_bytes, media_type, crayon_type, color):
        self.calls.append((crayon_type, color))
        if self.raises:
            raise self.raises
        return self.verdict


def build(client_app, *, verdict=True, raises=None):
    repo, vision = FakeCollectiblesRepository(), FakeVision(verdict, raises)
    client_app.dependency_overrides[get_collectibles_service] = (
        lambda: CollectiblesService(repo, vision)
    )
    return repo, vision


def photo():
    return {"file": ("crayon.png", io.BytesIO(b"fake-image-bytes"), "image/png")}


def form(**overrides):
    return {
        "set_name": "Nature Set",
        "crayon_name": "Butterfly",
        "type": "butterfly",
        "color": "#A855F7",
        **overrides,
    }


def test_a_match_records_the_unlock(app, client):
    repo, vision = build(app, verdict=True)

    res = client.post("/api/collectibles/verify", files=photo(), data=form())

    assert res.status_code == 200
    assert res.json() == {"matched": True, "key": "Nature Set/Butterfly"}
    assert repo.rows == [
        {
            "user_id": TEST_USER.id,
            "set_name": "Nature Set",
            "crayon_name": "Butterfly",
        }
    ]
    assert vision.calls == [("butterfly", "#A855F7")]


def test_a_non_match_records_nothing(app, client):
    """The whole point: failing the photo check must not unlock anything."""
    repo, _ = build(app, verdict=False)

    res = client.post("/api/collectibles/verify", files=photo(), data=form())

    assert res.status_code == 200
    assert res.json()["matched"] is False
    assert repo.rows == []


def test_a_vision_outage_records_nothing_and_reports_it(app, client):
    """A 503 must not be mistaken for 'verified'."""
    repo, _ = build(app, raises=ServiceUnavailableError("Not configured."))

    res = client.post("/api/collectibles/verify", files=photo(), data=form())

    assert res.status_code == 503
    assert repo.rows == []


def test_rescanning_is_idempotent(app, client):
    repo, _ = build(app, verdict=True)

    client.post("/api/collectibles/verify", files=photo(), data=form())
    client.post("/api/collectibles/verify", files=photo(), data=form())

    assert len(repo.rows) == 1


def test_list_returns_the_keys_the_spa_expects(app, client):
    repo, _ = build(app, verdict=True)
    repo.rows.append(
        {"user_id": TEST_USER.id, "set_name": "Animals Set", "crayon_name": "Lion"}
    )

    res = client.get("/api/collectibles")

    assert res.status_code == 200
    assert res.json() == {"collected": ["Animals Set/Lion"]}


def test_another_users_collectibles_are_invisible(app, client):
    repo, _ = build(app, verdict=True)
    repo.rows.append(
        {"user_id": "someone-else", "set_name": "Animals Set", "crayon_name": "Lion"}
    )

    assert client.get("/api/collectibles").json() == {"collected": []}


@pytest.mark.parametrize("missing", ["set_name", "crayon_name", "type", "color"])
def test_every_form_field_is_required(app, client, missing):
    build(app, verdict=True)
    data = form()
    del data[missing]

    res = client.post("/api/collectibles/verify", files=photo(), data=data)

    assert res.status_code == 422


def test_verify_requires_authentication(anon_client):
    res = anon_client.post("/api/collectibles/verify", files=photo(), data=form())
    assert res.status_code == 401


def test_list_requires_authentication(anon_client):
    assert anon_client.get("/api/collectibles").status_code == 401
