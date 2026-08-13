"""Supabase connection.

The client is created lazily and cached, so importing this module never fails
when Supabase is unconfigured — the failure happens at call time with a clear
503 instead of crashing the whole app at startup. That is what lets the API
boot and serve /api/health on a machine that has not been given keys yet.
"""
from functools import lru_cache
from typing import TYPE_CHECKING

from app.config import get_settings
from app.core.errors import ServiceUnavailableError

if TYPE_CHECKING:  # pragma: no cover
    from supabase import Client


@lru_cache
def get_supabase() -> "Client":
    """Return a service-role Supabase client.

    This client bypasses row-level security, so every caller is responsible for
    scoping queries to the acting user. Never hand this key to the frontend.
    """
    settings = get_settings()
    if not settings.supabase_configured:
        raise ServiceUnavailableError(
            "The database is not configured on this server.",
            detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset",
        )

    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def reset_supabase_cache() -> None:
    """Drop the cached client. Used by tests that swap configuration."""
    get_supabase.cache_clear()
