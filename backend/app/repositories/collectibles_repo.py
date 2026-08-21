"""Persistence for verified collectibles.

A row here means "this user photographed this physical crayon and the vision
check passed". The unique constraint on (user_id, set_name, crayon_name) is what
makes collecting idempotent — re-scanning a crayon you already own is a no-op,
not a duplicate.
"""
from typing import Any

from psycopg import Error as PgError

from app.core.errors import UpstreamError
from app.repositories.db import cursor, uuid_or_missing

# Written out rather than interpolated: every query here is a fixed string, so
# there is no place for a request value to become SQL.
LIST_SQL = (
    "SELECT id::text AS id, user_id::text AS user_id, set_name, crayon_name, "
    "verified_at FROM collectibles "
    "WHERE user_id = %(user_id)s ORDER BY verified_at DESC"
)

ADD_SQL = (
    "INSERT INTO collectibles (user_id, set_name, crayon_name) "
    "VALUES (%(user_id)s, %(set_name)s, %(crayon_name)s) "
    "ON CONFLICT (user_id, set_name, crayon_name) "
    "DO UPDATE SET crayon_name = EXCLUDED.crayon_name "
    "RETURNING id::text AS id, user_id::text AS user_id, set_name, crayon_name, "
    "verified_at"
)


class CollectiblesRepository:
    def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        try:
            with cursor() as cur:
                cur.execute(
                    LIST_SQL,
                    {"user_id": uuid_or_missing(user_id, "collectible")},
                )
                return cur.fetchall()
        except PgError as exc:
            raise UpstreamError(detail=f"list collectibles failed: {exc}") from exc

    def add(self, user_id: str, set_name: str, crayon_name: str) -> dict[str, Any]:
        """Record a verified collectible.

        ON CONFLICT makes a repeat scan succeed quietly instead of colliding
        with the unique constraint. The conflicting branch assigns a column to
        its own excluded value: a deliberate no-op, because DO NOTHING would
        return no row while the caller still expects one — and because
        `verified_at` should keep recording the FIRST time it was earned.
        """
        try:
            with cursor() as cur:
                cur.execute(
                    ADD_SQL,
                    {
                        "user_id": uuid_or_missing(user_id, "collectible"),
                        "set_name": set_name,
                        "crayon_name": crayon_name,
                    },
                )
                row = cur.fetchone()
        except PgError as exc:
            raise UpstreamError(detail=f"add collectible failed: {exc}") from exc
        return row or {
            "user_id": user_id,
            "set_name": set_name,
            "crayon_name": crayon_name,
        }
