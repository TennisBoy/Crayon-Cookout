"""PostgreSQL connection pool.

The pool is created lazily and cached, so importing this module never fails when
the database is unconfigured — the failure happens at call time with a clear 503
instead of crashing the whole app at startup. That is what lets the API boot and
serve /api/health on a machine that has not been given a DSN yet.

Connections come from a pool because Postgres' handshake is several round trips
plus authentication; opening one per request would cost more than the query.
"""
from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache
from typing import TYPE_CHECKING, Any
from uuid import UUID

from app.config import get_settings
from app.core.errors import NotFoundError, ServiceUnavailableError

if TYPE_CHECKING:  # pragma: no cover
    from psycopg import Cursor
    from psycopg_pool import ConnectionPool


@lru_cache
def get_pool() -> "ConnectionPool":
    """Return the process-wide connection pool.

    This connects as the database owner, which — like the Supabase service role
    key it replaced — BYPASSES row-level security. Every caller is responsible
    for scoping queries to the acting user.
    """
    settings = get_settings()
    if not settings.database_configured:
        raise ServiceUnavailableError(
            "The database is not configured on this server.",
            detail="DATABASE_URL is unset",
        )

    from psycopg_pool import ConnectionPool

    return ConnectionPool(
        settings.database_url,
        min_size=1,
        max_size=settings.database_pool_max,
        # Fail fast rather than hanging a request thread on a dead database.
        timeout=10,
        open=True,
    )


@contextmanager
def cursor() -> Iterator["Cursor[dict[str, Any]]"]:
    """Yield a dict-returning cursor inside a transaction.

    The transaction commits when the block exits cleanly and rolls back if it
    raises, so repositories never manage transactions by hand.
    """
    from psycopg.rows import dict_row

    with get_pool().connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        yield cur


def uuid_or_missing(value: str, what: str) -> UUID:
    """Reject a malformed id as "not found" rather than letting it reach SQL.

    Postgres would raise `invalid input syntax for type uuid`, which would
    surface as a 500 for what is really a bad path parameter.
    """
    try:
        return UUID(value)
    except (ValueError, AttributeError, TypeError):
        raise NotFoundError(f"That {what} does not exist.") from None


def reset_pool_cache() -> None:
    """Drop the cached pool. Used by tests that swap configuration."""
    get_pool.cache_clear()
