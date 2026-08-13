"""Persistence for crayon designs.

The only module that knows designs live in a Postgres table. Services talk to
this; routes never do.
"""
from typing import Any

from app.core.errors import NotFoundError, UpstreamError
from app.repositories.supabase_client import get_supabase

TABLE = "crayon_designs"

# Explicit column list: `select("*")` would leak any column added later.
COLUMNS = (
    "id, user_id, name, colors, heights, shape, "
    "is_competition_entry, competition_email, created_date"
)

SORTABLE = {"created_date", "name"}


class DesignsRepository:
    def _table(self):
        return get_supabase().table(TABLE)

    def list_for_user(
        self, user_id: str, *, sort: str = "-created_date", limit: int = 50
    ) -> list[dict[str, Any]]:
        descending = sort.startswith("-")
        field = sort[1:] if descending else sort
        if field not in SORTABLE:
            field, descending = "created_date", True

        try:
            res = (
                self._table()
                .select(COLUMNS)
                .eq("user_id", user_id)
                .order(field, desc=descending)
                .limit(limit)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001 - upstream client raises broadly
            raise UpstreamError(detail=f"list designs failed: {exc}") from exc
        return res.data or []

    def get(self, design_id: str, user_id: str) -> dict[str, Any]:
        try:
            res = (
                self._table()
                .select(COLUMNS)
                .eq("id", design_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise UpstreamError(detail=f"get design failed: {exc}") from exc
        if not res.data:
            raise NotFoundError("That design does not exist.")
        return res.data[0]

    def create(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        row = {**payload, "user_id": user_id}
        try:
            res = self._table().insert(row).execute()
        except Exception as exc:  # noqa: BLE001
            raise UpstreamError(detail=f"create design failed: {exc}") from exc
        if not res.data:
            raise UpstreamError(detail="insert returned no row")
        return res.data[0]

    def update(
        self, design_id: str, user_id: str, patch: dict[str, Any]
    ) -> dict[str, Any]:
        # Scoping the update by user_id means another user's id in the path
        # simply matches nothing, rather than mutating their row.
        try:
            res = (
                self._table()
                .update(patch)
                .eq("id", design_id)
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise UpstreamError(detail=f"update design failed: {exc}") from exc
        if not res.data:
            raise NotFoundError("That design does not exist.")
        return res.data[0]

    def delete(self, design_id: str, user_id: str) -> None:
        try:
            res = (
                self._table()
                .delete()
                .eq("id", design_id)
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise UpstreamError(detail=f"delete design failed: {exc}") from exc
        if not res.data:
            raise NotFoundError("That design does not exist.")
