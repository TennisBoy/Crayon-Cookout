"""Rate limiting on the auth endpoints."""
import pytest

from app.core.rate_limit import Limit, RateLimiter, RateLimitError, limiter


@pytest.fixture(autouse=True)
def _clean():
    limiter.reset()
    yield
    limiter.reset()


class TestRateLimiter:
    def test_allows_up_to_the_limit(self):
        rl = RateLimiter()
        limit = Limit(max_calls=3, window_seconds=60)
        for _ in range(3):
            rl.check("k", limit, now=100.0)

    def test_rejects_the_call_past_the_limit(self):
        rl = RateLimiter()
        limit = Limit(max_calls=3, window_seconds=60)
        for _ in range(3):
            rl.check("k", limit, now=100.0)
        with pytest.raises(RateLimitError):
            rl.check("k", limit, now=100.0)

    def test_the_window_slides(self):
        rl = RateLimiter()
        limit = Limit(max_calls=2, window_seconds=60)
        rl.check("k", limit, now=100.0)
        rl.check("k", limit, now=100.0)
        with pytest.raises(RateLimitError):
            rl.check("k", limit, now=130.0)
        # Past the window, the budget is back.
        rl.check("k", limit, now=200.0)

    def test_keys_are_independent(self):
        """One client being throttled must not lock everyone else out."""
        rl = RateLimiter()
        limit = Limit(max_calls=1, window_seconds=60)
        rl.check("a", limit, now=100.0)
        rl.check("b", limit, now=100.0)
        with pytest.raises(RateLimitError):
            rl.check("a", limit, now=100.0)

    def test_prune_drops_stale_keys(self):
        rl = RateLimiter()
        rl.check("old", Limit(max_calls=5, window_seconds=60), now=1.0)
        assert rl._hits
        rl.prune(older_than_seconds=0)
        assert not rl._hits


class TestLoginIsThrottled:
    def test_repeated_login_attempts_are_eventually_rejected(self, anon_client):
        """Unlimited password guessing is the hole this closes."""
        body = {"email": "someone@example.com", "password": "wrong-password"}

        statuses = [
            anon_client.post("/api/auth/login", json=body).status_code
            for _ in range(15)
        ]

        assert 429 in statuses, "login was never throttled"
        # The early attempts still get a real answer (503 here, since Supabase
        # is unconfigured in tests) rather than being throttled immediately.
        assert statuses[0] != 429

    def test_the_throttle_message_is_user_facing(self, anon_client):
        body = {"email": "a@b.c", "password": "x"}
        last = None
        for _ in range(15):
            last = anon_client.post("/api/auth/login", json=body)
        assert last.status_code == 429
        assert last.json()["error"]["code"] == "rate_limited"
        assert "try again" in last.json()["error"]["message"].lower()

    def test_signup_is_throttled_separately_from_login(self, anon_client):
        """Exhausting one bucket must not close the other."""
        for _ in range(15):
            anon_client.post(
                "/api/auth/login", json={"email": "a@b.c", "password": "x"}
            )

        res = anon_client.post(
            "/api/auth/signup", json={"email": "a@b.c", "password": "longenough"}
        )
        assert res.status_code != 429

    def test_health_is_never_throttled(self, anon_client):
        """Docker's healthcheck polls this constantly."""
        for _ in range(50):
            assert anon_client.get("/api/health").status_code == 200
