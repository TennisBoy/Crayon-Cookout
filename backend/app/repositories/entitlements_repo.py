"""Persistence for entitlements.

A row here means "this user has paid for this feature". The unique constraint
on (user_id, feature) makes granting idempotent, and the partial unique index
on `reference` makes it idempotent per payment too -- Stripe is explicitly
allowed to deliver the same webhook more than once.
"""
from typing import Any

from psycopg import Error as PgError

from app.core.errors import UpstreamError
from app.repositories.db import cursor, uuid_or_missing

LIST_SQL = (
    "SELECT feature, source, reference, granted_at FROM entitlements "
    "WHERE user_id = %(user_id)s ORDER BY granted_at"
)

GRANT_SQL = (
    "INSERT INTO entitlements (user_id, feature, source, reference) "
    "VALUES (%(user_id)s, %(feature)s, %(source)s, %(reference)s) "
    # Already owned: keep the original grant rather than rewriting when or how
    # it was earned. DO NOTHING would return no row while the caller expects one.
    "ON CONFLICT (user_id, feature) DO UPDATE SET feature = EXCLUDED.feature "
    "RETURNING feature, source, reference, granted_at"
)


class EntitlementsRepository:
    def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        try:
            with cursor() as cur:
                cur.execute(
                    LIST_SQL, {"user_id": uuid_or_missing(user_id, "entitlement")}
                )
                return cur.fetchall()
        except PgError as exc:
            raise UpstreamError(detail=f"list entitlements failed: {exc}") from exc

    def grant(
        self,
        user_id: str,
        feature: str,
        *,
        source: str = "purchase",
        reference: str | None = None,
    ) -> dict[str, Any]:
        try:
            with cursor() as cur:
                cur.execute(
                    GRANT_SQL,
                    {
                        "user_id": uuid_or_missing(user_id, "entitlement"),
                        "feature": feature,
                        "source": source,
                        "reference": reference,
                    },
                )
                return cur.fetchone() or {}
        except PgError as exc:
            raise UpstreamError(detail=f"grant entitlement failed: {exc}") from exc
