"""A small fixed-window rate limiter for the auth endpoints.

Scope, stated plainly: this is **in-process**. It counts per container, so two
uvicorn workers each get their own budget, and a restart clears it. That is
adequate for slowing credential stuffing against a single small deployment and
is NOT a substitute for an edge rule. Cloudflare sits in front of this
deployment and is the right place for real protection.

It is here because a login endpoint with no throttle at all is worse than one
with a crude throttle, and because it needs no extra infrastructure.
"""
import time
from collections import defaultdict, deque
from dataclasses import dataclass

from app.core.errors import AppError


class RateLimitError(AppError):
    status_code = 429
    code = "rate_limited"
    message = "Too many attempts. Please wait a moment and try again."


@dataclass(frozen=True)
class Limit:
    max_calls: int
    window_seconds: int


class RateLimiter:
    def __init__(self):
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: Limit, *, now: float | None = None) -> None:
        """Record a call and raise if the caller is over budget."""
        now = time.monotonic() if now is None else now
        window_start = now - limit.window_seconds
        hits = self._hits[key]

        while hits and hits[0] < window_start:
            hits.popleft()

        if len(hits) >= limit.max_calls:
            raise RateLimitError()

        hits.append(now)

    def reset(self) -> None:
        self._hits.clear()

    def prune(self, older_than_seconds: int = 3600) -> None:
        """Drop keys with no recent activity.

        Without this the dict grows once per distinct client address, which is
        a slow memory leak on a long-running process.
        """
        cutoff = time.monotonic() - older_than_seconds
        for key in [k for k, v in self._hits.items() if not v or v[-1] < cutoff]:
            del self._hits[key]


# Deliberately generous: a parent mistyping a password several times must not
# be locked out, while a script trying thousands is stopped.
LOGIN = Limit(max_calls=10, window_seconds=60)
SIGNUP = Limit(max_calls=5, window_seconds=300)
PASSWORD_RESET = Limit(max_calls=5, window_seconds=900)
OTP = Limit(max_calls=10, window_seconds=300)

limiter = RateLimiter()
