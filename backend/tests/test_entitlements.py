"""Entitlements: the server-side answer to "what has this user paid for?".

The important property is what is NOT here: no endpoint grants anything. A
client that could grant its own entitlements would make paying optional, which
is the whole reason this moved off localStorage.
"""
import pytest
from fastapi.testclient import TestClient

from app.api.deps import current_user, get_entitlements_service
from app.core.errors import ValidationError
from app.main import create_app
from app.services.entitlements_service import EntitlementsService
from tests.conftest import TEST_USER


class FakeEntitlementsRepository:
    def __init__(self):
        self.rows: list[dict] = []

    def list_for_user(self, user_id):
        return [r for r in self.rows if r["user_id"] == user_id]

    def grant(self, user_id, feature, *, source="purchase", reference=None):
        for r in self.rows:
            if r["user_id"] == user_id and r["feature"] == feature:
                return r  # already owned: unchanged, as ON CONFLICT does
        row = {
            "user_id": user_id,
            "feature": feature,
            "source": source,
            "reference": reference,
            "granted_at": "2026-01-01T00:00:00Z",
        }
        self.rows.append(row)
        return row


@pytest.fixture
def repo():
    return FakeEntitlementsRepository()


@pytest.fixture
def service(repo):
    return EntitlementsService(repo)


@pytest.fixture
def client(service):
    app = create_app()
    app.dependency_overrides[current_user] = lambda: TEST_USER
    app.dependency_overrides[get_entitlements_service] = lambda: service
    return TestClient(app)


def test_a_new_user_owns_nothing(client):
    res = client.get("/api/entitlements")
    assert res.status_code == 200
    assert res.json() == {"features": []}


def test_granted_features_are_listed(client, service):
    service.grant(TEST_USER.id, "kitchen")
    assert client.get("/api/entitlements").json() == {"features": ["kitchen"]}


def test_granting_twice_is_idempotent(service):
    service.grant(TEST_USER.id, "kitchen")
    features = service.grant(TEST_USER.id, "kitchen")
    assert features == ["kitchen"]


def test_grant_returns_the_whole_set(service):
    service.grant(TEST_USER.id, "kitchen")
    assert service.grant(TEST_USER.id, "colouring") == ["kitchen", "colouring"]


def test_unknown_features_cannot_be_granted(service):
    """The webhook passes a feature name through; it is not free-form."""
    with pytest.raises(ValidationError):
        service.grant(TEST_USER.id, "everything")


def test_entitlements_are_scoped_to_the_user(client, service):
    service.grant("22222222-2222-4222-8222-222222222222", "kitchen")
    assert client.get("/api/entitlements").json() == {"features": []}


def test_there_is_no_endpoint_that_grants(client):
    """A POST would let a client buy for free. It must not exist."""
    res = client.post("/api/entitlements", json={"feature": "kitchen"})
    assert res.status_code == 405


def test_signed_out_callers_are_rejected(anon_client):
    assert anon_client.get("/api/entitlements").status_code == 401
