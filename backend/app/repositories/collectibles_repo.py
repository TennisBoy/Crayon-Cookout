"""Persistence for verified collectibles.

A row here means "this user photographed this physical crayon and the vision
check passed". The unique constraint on (user_id, set_name, crayon_name) is what
makes collecting idempotent — re-scanning a crayon you already own is a no-op,
not a duplicate.
"""
from typing import Any

from app.core.errors import UpstreamError
from app.repositories.supabase_client import get_supabase

TABLE = "collectibles"
COLUMNS = "id, user_id, set_name, crayon_name, verified_at"


class CollectiblesRepository:
    def _table(self):
        return get_supabase().table(TABLE)

    def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        try:
            res = (
                self._table()
                .select(COLUMNS)
                .eq("user_id", user_id)
                .order("verified_at", desc=True)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise UpstreamError(detail=f"list collectibles failed: {exc}") from exc
        return res.data or []

    def add(self, user_id: str, set_name: str, crayon_name: str) -> dict[str, Any]:
        """Record a verified collectible.

        Uses upsert so a repeat scan succeeds quietly instead of colliding with
        the unique constraint.
        """
        row = {"user_id": user_id, "set_name": set_name, "crayon_name": crayon_name}
        try:
            res = (
                self._table()
                .upsert(row, on_conflict="user_id,set_name,crayon_name")
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise UpstreamError(detail=f"add collectible failed: {exc}") from exc
        return res.data[0] if res.data else row
