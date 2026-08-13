"""Auth endpoints.

Note the response models: signup, resend and password-reset-request all return
a neutral `MessageOut`. That is the anti-enumeration property — the response
must not differ based on whether the address is registered.
"""
from typing import Annotated

from fastapi import APIRouter, Header

from app.api.deps import AuthDep, CurrentUser
from app.schemas.auth import (
    EmailOnlyRequest,
    MessageOut,
    PasswordResetConfirm,
    SessionOut,
    SignInRequest,
    SignUpRequest,
    UserOut,
    VerifyOtpRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=MessageOut)
def sign_up(payload: SignUpRequest, auth: AuthDep) -> MessageOut:
    return MessageOut(message=auth.sign_up(payload.email, payload.password))


@router.post("/verify-otp", response_model=SessionOut)
def verify_otp(payload: VerifyOtpRequest, auth: AuthDep) -> SessionOut:
    return auth.verify_otp(payload.email, payload.code)


@router.post("/resend-otp", response_model=MessageOut)
def resend_otp(payload: EmailOnlyRequest, auth: AuthDep) -> MessageOut:
    return MessageOut(message=auth.resend_otp(payload.email))


@router.post("/login", response_model=SessionOut)
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


@router.post("/password-reset/request", response_model=MessageOut)
def request_password_reset(payload: EmailOnlyRequest, auth: AuthDep) -> MessageOut:
    return MessageOut(message=auth.request_password_reset(payload.email))


@router.post("/password-reset/confirm", response_model=MessageOut)
def confirm_password_reset(
    payload: PasswordResetConfirm, auth: AuthDep
) -> MessageOut:
    return MessageOut(
        message=auth.confirm_password_reset(payload.token, payload.new_password)
    )
