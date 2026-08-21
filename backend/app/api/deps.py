"""Shared route dependencies."""
from typing import Annotated

from fastapi import Depends, Header, Request

from app.core.errors import AuthError
from app.core.rate_limit import Limit, limiter
from app.schemas.auth import UserOut
from app.services.auth_service import AuthService
from app.services.billing_service import BillingService
from app.services.designs_service import DesignsService
from app.services.entitlements_service import EntitlementsService


def get_auth_service() -> AuthService:
    return AuthService()


def get_designs_service() -> DesignsService:
    return DesignsService()


def get_entitlements_service() -> EntitlementsService:
    return EntitlementsService()


def get_billing_service() -> BillingService:
    return BillingService()


def _bearer(authorization: str | None) -> str:
    if not authorization:
        raise AuthError()
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise AuthError()
    return token.strip()


def current_user(
    authorization: Annotated[str | None, Header()] = None,
    auth: Annotated[AuthService, Depends(get_auth_service)] = None,
) -> UserOut:
    """Resolve the caller from their bearer token, or reject with 401."""
    return auth.get_user(_bearer(authorization))


CurrentUser = Annotated[UserOut, Depends(current_user)]
AuthDep = Annotated[AuthService, Depends(get_auth_service)]
DesignsDep = Annotated[DesignsService, Depends(get_designs_service)]
EntitlementsDep = Annotated[
    EntitlementsService, Depends(get_entitlements_service)
]
BillingDep = Annotated[BillingService, Depends(get_billing_service)]


def client_key(request: Request) -> str:
    """Identify the caller for rate limiting.

    Behind Cloudflare Tunnel the socket peer is always loopback, so the real
    address arrives in a forwarded header. CF-Connecting-IP is set by
    Cloudflare and cannot be spoofed by the client when the only path in is
    the tunnel; X-Forwarded-For is the fallback for a direct/local run.
    """
    forwarded = request.headers.get("cf-connecting-ip") or request.headers.get(
        "x-forwarded-for"
    )
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(name: str, limit: Limit):
    """Build a dependency that throttles a route per client address."""

    def dependency(request: Request) -> None:
        limiter.check(f"{name}:{client_key(request)}", limit)

    return dependency
