"""Liveness and readiness.

`/api/health` must stay dependency-free — Docker's healthcheck and Cloudflare
Tunnel both poll it, and it has to answer on a box with no Supabase keys.
`/api/health/ready` is the one that reports what is actually wired up.
"""
from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/health/ready")
def ready() -> dict:
    """Report which optional capabilities are configured.

    Deliberately reports booleans, never key values or URLs.
    """
    settings = get_settings()
    return {
        "status": "ok",
        "environment": settings.environment,
        "capabilities": {
            # Designs and collectibles: direct PostgreSQL.
            "database": settings.database_configured,
            # Register, OTP, login, reset, refresh: Supabase Auth. Separate
            # credential, so it can be down while the database is fine.
            "auth": settings.supabase_configured,
            "vision": settings.vision_configured,
        },
    }
