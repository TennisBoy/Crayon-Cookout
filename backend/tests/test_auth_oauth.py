"""OAuth authorize-URL construction.

The interesting behaviour here is refusal, not success: `return_to` comes from
the request, and the browser arrives back at that destination holding a real
session in the URL fragment. A permissive redirect target would hand that
session to whoever asked for it.
"""
from urllib.parse import quote

import pytest

from app.config import get_settings
from app.core.errors import ServiceUnavailableError, ValidationError
from app.services.auth_service import AuthService

SITE = "https://crayoncookout.test"


@pytest.fixture
def configured(monkeypatch):
    """Point the service at a Supabase project without needing real keys."""
    settings = get_settings()
    monkeypatch.setattr(settings, "supabase_url", "https://ref.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_role_key", "eyJ-test")
    monkeypatch.setattr(settings, "public_site_url", SITE)
    return AuthService()


def test_builds_an_authorize_url(configured):
    url = configured.oauth_authorize_url("google", "/home")
    assert url.startswith("https://ref.supabase.co/auth/v1/authorize?")
    assert "provider=google" in url
    assert "auth%2Fcallback" in url or "/auth/callback" in url


def test_return_to_is_carried_through(configured):
    url = configured.oauth_authorize_url("google", "/library")
    assert "next%3D%2Flibrary" in url or "next=/library" in url


def test_absolute_return_to_is_refused(configured):
    """An open redirect here leaks the session that lands in the fragment."""
    with pytest.raises(ValidationError):
        configured.oauth_authorize_url("google", "https://evil.example")


def test_protocol_relative_return_to_is_refused(configured):
    """`//evil.example` leaves the site while looking like a path."""
    with pytest.raises(ValidationError):
        configured.oauth_authorize_url("google", "//evil.example")


def test_unknown_provider_is_refused(configured):
    with pytest.raises(ValidationError):
        configured.oauth_authorize_url("facebook", "/home")


def test_callback_origin_comes_from_config(configured):
    """Regression: this used to read the Origin header.

    Browsers omit Origin on same-origin GETs, so every real call from the SPA
    was rejected with "Unrecognised origin" while a hand-made curl carrying the
    header passed. The callback host is configuration now.
    """
    url = configured.oauth_authorize_url("google", "/home")
    assert quote(SITE, safe="") in url or SITE.replace(":", "%3A") in url


def test_unconfigured_supabase_reports_503(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "supabase_url", "")
    monkeypatch.setattr(settings, "supabase_service_role_key", "")
    with pytest.raises(ServiceUnavailableError):
        AuthService().oauth_authorize_url("google", "/home")


def test_endpoint_returns_a_url(anon_client, configured):
    # No Origin header -- exactly what a browser sends for a same-origin GET.
    res = anon_client.get("/api/auth/oauth/google", params={"return_to": "/home"})
    assert res.status_code == 200
    assert res.json()["url"].startswith("https://ref.supabase.co/auth/v1/authorize")


def test_endpoint_refuses_an_absolute_return_to(anon_client, configured):
    res = anon_client.get(
        "/api/auth/oauth/google", params={"return_to": "https://evil.example"}
    )
    assert res.status_code == 422
