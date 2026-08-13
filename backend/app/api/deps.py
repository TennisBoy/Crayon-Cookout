"""Shared route dependencies."""
from typing import Annotated

from fastapi import Depends, Header

from app.core.errors import AuthError
from app.schemas.auth import UserOut
from app.services.auth_service import AuthService
from app.services.designs_service import DesignsService


def get_auth_service() -> AuthService:
    return AuthService()


def get_designs_service() -> DesignsService:
    return DesignsService()


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
