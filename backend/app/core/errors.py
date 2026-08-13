"""Domain errors and the handlers that turn them into HTTP responses.

Services raise these; routes never build error responses by hand. Keeping the
mapping in one place is what stops internal detail leaking into API output.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base class for expected, user-facing failures."""

    status_code = 500
    code = "internal_error"
    message = "Something went wrong."

    def __init__(self, message: str | None = None, *, detail: str | None = None):
        super().__init__(message or self.message)
        if message:
            self.message = message
        self.detail = detail


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"
    message = "The requested resource does not exist."


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"
    message = "The request was not valid."


class AuthError(AppError):
    status_code = 401
    code = "unauthenticated"
    message = "Authentication is required."


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"
    message = "You do not have access to this resource."


class ServiceUnavailableError(AppError):
    status_code = 503
    code = "service_unavailable"
    message = "This capability is not configured on the server."


class UpstreamError(AppError):
    status_code = 502
    code = "upstream_error"
    message = "A dependency failed."


def _payload(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        # `detail` is for our logs only — it never goes over the wire.
        if exc.detail:
            logger.warning("%s: %s | %s", exc.code, exc.message, exc.detail)
        return JSONResponse(
            status_code=exc.status_code, content=_payload(exc.code, exc.message)
        )

    @app.exception_handler(RequestValidationError)
    async def _request_validation(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else {}
        field = ".".join(str(p) for p in first.get("loc", []) if p != "body")
        message = first.get("msg", "The request was not valid.")
        return JSONResponse(
            status_code=422,
            content=_payload(
                "validation_error",
                f"{field}: {message}" if field else message,
            ),
        )

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        # Log the real cause, return a generic message. Never echo a stack
        # trace or an upstream error string to the client.
        logger.exception("Unhandled error: %s", exc)
        return JSONResponse(
            status_code=500,
            content=_payload("internal_error", "Something went wrong."),
        )
