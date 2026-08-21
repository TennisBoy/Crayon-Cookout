"""Authentication, backed by Supabase Auth (GoTrue).

Two properties this module is responsible for:

1. **No account enumeration.** Signup and password-reset return the same
   neutral response whether or not the address is registered. The frontend's
   ForgotPassword page already behaves this way; the server must not undo it.
2. **No upstream error text reaches the client.** GoTrue messages distinguish
   "user not found" from "wrong password"; both surface here as one generic
   failure.
"""
import logging

from app.config import get_settings
from app.core.errors import (
    AuthError,
    ServiceUnavailableError,
    UpstreamError,
    ValidationError,
)
from app.repositories.supabase_client import get_supabase
from app.schemas.auth import SessionOut, UserOut

logger = logging.getLogger(__name__)

GENERIC_SIGNIN_FAILURE = "That email or password is not correct."
NEUTRAL_MESSAGE = (
    "If an account exists for that address, we have sent it an email."
)


ALLOWED_OAUTH_PROVIDERS = frozenset({"google"})


class AuthService:
    def _auth(self):
        try:
            return get_supabase().auth
        except ServiceUnavailableError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise UpstreamError(detail=f"supabase auth unavailable: {exc}") from exc

    # --- Registration ------------------------------------------------------

    def sign_up(self, email: str, password: str) -> str:
        try:
            self._auth().sign_up({"email": email, "password": password})
        except ServiceUnavailableError:
            raise
        except Exception as exc:  # noqa: BLE001
            # Includes "user already registered". Swallowed deliberately:
            # telling the caller would enumerate accounts.
            logger.info("sign_up non-fatal: %s", exc)
        return NEUTRAL_MESSAGE

    def verify_otp(self, email: str, code: str) -> SessionOut:
        try:
            res = self._auth().verify_otp(
                {"email": email, "token": code, "type": "signup"}
            )
        except ServiceUnavailableError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise AuthError("That code is not valid or has expired.") from exc

        if not res.session or not res.user:
            raise AuthError("That code is not valid or has expired.")
        return SessionOut(
            access_token=res.session.access_token,
            refresh_token=res.session.refresh_token,
            user=UserOut(id=res.user.id, email=res.user.email),
        )

    def resend_otp(self, email: str) -> str:
        try:
            self._auth().resend({"type": "signup", "email": email})
        except ServiceUnavailableError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.info("resend_otp non-fatal: %s", exc)
        return NEUTRAL_MESSAGE

    # --- Session -----------------------------------------------------------

    def sign_in(self, email: str, password: str) -> SessionOut:
        try:
            res = self._auth().sign_in_with_password(
                {"email": email, "password": password}
            )
        except ServiceUnavailableError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.info("sign_in failed for a request: %s", exc)
            raise AuthError(GENERIC_SIGNIN_FAILURE) from exc

        if not res.session or not res.user:
            raise AuthError(GENERIC_SIGNIN_FAILURE)
        return SessionOut(
            access_token=res.session.access_token,
            refresh_token=res.session.refresh_token,
            user=UserOut(id=res.user.id, email=res.user.email),
        )

    def refresh_session(self, refresh_token: str) -> SessionOut:
        try:
            res = self._auth().refresh_session(refresh_token)
        except ServiceUnavailableError:
            raise
        except Exception as exc:  # noqa: BLE001
            # A spent or revoked refresh token means "sign in again", not an
            # error worth explaining in detail.
            raise AuthError("Your session has expired. Please sign in again.") from exc

        if not res.session or not res.user:
            raise AuthError("Your session has expired. Please sign in again.")
        return SessionOut(
            access_token=res.session.access_token,
            refresh_token=res.session.refresh_token,
            user=UserOut(id=res.user.id, email=res.user.email),
        )

    def get_user(self, access_token: str) -> UserOut:
        try:
            res = self._auth().get_user(access_token)
        except ServiceUnavailableError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise AuthError() from exc
        if not res or not res.user:
            raise AuthError()
        return UserOut(id=res.user.id, email=res.user.email)

    def sign_out(self, access_token: str) -> None:
        try:
            self._auth().admin.sign_out(access_token)
        except Exception as exc:  # noqa: BLE001
            # A token that is already dead is a successful logout.
            logger.info("sign_out non-fatal: %s", exc)

    # --- Password reset ----------------------------------------------------

    def request_password_reset(self, email: str) -> str:
        try:
            self._auth().reset_password_email(email)
        except ServiceUnavailableError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.info("reset request non-fatal: %s", exc)
        return NEUTRAL_MESSAGE

    def confirm_password_reset(self, token: str, new_password: str) -> str:
        try:
            res = self._auth().verify_otp({"token_hash": token, "type": "recovery"})
            if not res.session:
                raise AuthError("That reset link is not valid or has expired.")
            self._auth().update_user({"password": new_password})
        except AuthError:
            raise
        except ServiceUnavailableError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise AuthError("That reset link is not valid or has expired.") from exc
        return "Your password has been updated."

    # --- OAuth -------------------------------------------------------------

    def oauth_authorize_url(self, provider: str, origin: str, return_to: str) -> str:
        """Build the GoTrue authorize URL the browser should be sent to.

        Built here rather than in the SPA so the Supabase URL stays out of the
        browser bundle, and so `return_to` is validated somewhere the client
        cannot skip.

        `return_to` is a PATH, never a URL. Accepting a full URL would make this
        an open redirect: an attacker could send a victim through our own
        domain to theirs, arriving with a real session in the fragment.
        """
        from urllib.parse import quote, urlencode

        settings = get_settings()
        if not settings.supabase_configured:
            raise ServiceUnavailableError(
                "Social sign-in is not configured on this server.",
                detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset",
            )
        if provider not in ALLOWED_OAUTH_PROVIDERS:
            raise ValidationError(f"{provider} sign-in is not supported.")
        if not return_to.startswith("/") or return_to.startswith("//"):
            # "//evil.com" is protocol-relative and would leave the site.
            raise ValidationError("return_to must be a path on this site.")
        if origin not in settings.cors_origin_list:
            raise ValidationError("Unrecognised origin.")

        callback = f"{origin}/auth/callback?next={quote(return_to, safe='/')}"
        query = urlencode({"provider": provider, "redirect_to": callback})
        return f"{settings.supabase_url}/auth/v1/authorize?{query}"
