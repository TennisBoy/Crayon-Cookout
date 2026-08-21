"""Test fixtures.

The suite runs without Supabase or an Anthropic key — repositories and the
vision client are faked. That is deliberate: CI must not need cloud credentials.
"""
import os

import pytest
from fastapi.testclient import TestClient

# Set before any app import so get_settings() caches test values.
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
os.environ.setdefault("DATABASE_URL", "")
os.environ.setdefault("SUPABASE_URL", "")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "")
os.environ.setdefault("ANTHROPIC_API_KEY", "")

from app.api.deps import current_user, get_designs_service  # noqa: E402
from app.main import create_app  # noqa: E402
from app.schemas.auth import UserOut  # noqa: E402
from app.services.designs_service import DesignsService  # noqa: E402

TEST_USER = UserOut(id="11111111-1111-4111-8111-111111111111", email="kid@example.com")
OTHER_USER_ID = "22222222-2222-4222-8222-222222222222"


class FakeDesignsRepository:
    """In-memory stand-in with the same scoping rules as the real repository."""

    def __init__(self):
        self.rows: list[dict] = []
        self._seq = 0

    def list_for_user(self, user_id, *, sort="-created_date", limit=50):
        descending = sort.startswith("-")
        field = sort[1:] if descending else sort
        if field not in {"created_date", "name"}:
            field, descending = "created_date", True
        mine = [r for r in self.rows if r["user_id"] == user_id]
        mine.sort(key=lambda r: r.get(field) or "", reverse=descending)
        return mine[:limit]

    def get(self, design_id, user_id):
        from app.core.errors import NotFoundError

        for r in self.rows:
            if r["id"] == design_id and r["user_id"] == user_id:
                return r
        raise NotFoundError("That design does not exist.")

    def create(self, user_id, payload):
        self._seq += 1
        row = {
            **payload,
            "id": f"d{self._seq}",
            "user_id": user_id,
            "created_date": f"2026-01-{self._seq:02d}T00:00:00Z",
            "is_competition_entry": False,
            "competition_email": None,
        }
        self.rows.append(row)
        return row

    def update(self, design_id, user_id, patch):
        row = self.get(design_id, user_id)
        row.update(patch)
        return row

    def delete(self, design_id, user_id):
        row = self.get(design_id, user_id)
        self.rows.remove(row)


@pytest.fixture
def repo() -> FakeDesignsRepository:
    return FakeDesignsRepository()


@pytest.fixture
def app(repo):
    application = create_app()
    application.dependency_overrides[current_user] = lambda: TEST_USER
    application.dependency_overrides[get_designs_service] = lambda: DesignsService(repo)
    return application


@pytest.fixture
def client(app) -> TestClient:
    return TestClient(app)


@pytest.fixture
def anon_client() -> TestClient:
    """A client with no auth override — used to prove routes are protected."""
    return TestClient(create_app())
