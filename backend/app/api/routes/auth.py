"""Auth endpoints.

Note the response models: signup, resend and password-reset-request all return
a neutral `MessageOut`. That is the anti-enumeration property — the response
must not differ based on whether the address is registered.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query

from app.api.deps import AuthDep, CurrentUser, rate_limit
from app.core.rate_limit import LOGIN, OTP, PASSWORD_RESET, SIGNUP
from app.schemas.auth import (
    EmailOnlyRequest,
    MessageOut,
    OAuthUrlOut,
    PasswordResetConfirm,
    RefreshRequest,
    SessionOut,
    SignInRequest,
    SignUpRequest,
    UserOut,
    VerifyOtpRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/signup",
    response_model=MessageOut,
    dependencies=[Depends(rate_limit("signup", SIGNUP))],
)
def sign_up(payload: SignUpRequest, auth: AuthDep) -> MessageOut:
    return MessageOut(message=auth.sign_up(payload.email, payload.password))


@router.post(
    "/verify-otp",
    response_model=SessionOut,
    dependencies=[Depends(rate_limit("otp", OTP))],
)
def verify_otp(payload: VerifyOtpRequest, auth: AuthDep) -> SessionOut:
    return auth.verify_otp(payload.email, payload.code)


@router.post(
    "/resend-otp",
    response_model=MessageOut,
    dependencies=[Depends(rate_limit("otp", OTP))],
)
def resend_otp(payload: EmailOnlyRequest, auth: AuthDep) -> MessageOut:
    return MessageOut(message=auth.resend_otp(payload.email))


@router.post(
    "/login",
    response_model=SessionOut,
    dependencies=[Depends(rate_limit("login", LOGIN))],
)
def login(payload: SignInRequest, auth: AuthDep) -> SessionOut:
    return auth.sign_in(payload.email, payload.password)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return user


@router.post("/logout", response_model=MessageOut)
def logout(
    auth: AuthDep, authorization: Annotated[str | None, Header()] = None
) -> MessageOut:
    # Logout is idempotent: an absent or dead token is still a success.
    if authorization and authorization.lower().startswith("bearer "):
        auth.sign_out(authorization.split(" ", 1)[1].strip())
    return MessageOut(message="Signed out.")


@router.post(
    "/password-reset/request",
    response_model=MessageOut,
    dependencies=[Depends(rate_limit("reset", PASSWORD_RESET))],
)
def request_password_reset(payload: EmailOnlyRequest, auth: AuthDep) -> MessageOut:
    return MessageOut(message=auth.request_password_reset(payload.email))


@router.post(
    "/password-reset/confirm",
    response_model=MessageOut,
    dependencies=[Depends(rate_limit("reset", PASSWORD_RESET))],
)
def confirm_password_reset(
    payload: PasswordResetConfirm, auth: AuthDep
) -> MessageOut:
    return MessageOut(
        message=auth.confirm_password_reset(payload.token, payload.new_password)
    )


@router.post("/refresh", response_model=SessionOut)
def refresh(payload: RefreshRequest, auth: AuthDep) -> SessionOut:
    """Exchange a refresh token for a fresh session.

    Supabase access tokens are short-lived. Without this the app would sign
    users out roughly hourly, mid-drawing.
    """
    return auth.refresh_session(payload.refresh_token)


@router.get("/oauth/{provider}", response_model=OAuthUrlOut)
def oauth_authorize(
    provider: str,
    auth: AuthDep,
    return_to: Annotated[str, Query(max_length=512)] = "/home",
) -> OAuthUrlOut:
    """Return the URL that starts a social sign-in.

    A GET returning a URL rather than a 302: the SPA needs to navigate the
    top-level window itself, and a redirect issued to fetch() would be followed
    invisibly instead.
    """
    return OAuthUrlOut(url=auth.oauth_authorize_url(provider, return_to))
