"""Checkout and the webhook.

The webhook is an unauthenticated endpoint that grants paid features, so its
signature check is the entire security model. Most of these tests are about
what it refuses.
"""
import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.api.deps import current_user, get_billing_service, get_entitlements_service
from app.config import get_settings
from app.core.errors import ServiceUnavailableError, ValidationError
from app.main import create_app
from app.services.billing_service import BillingService
from app.services.entitlements_service import EntitlementsService
from tests.conftest import TEST_USER
from tests.test_entitlements import FakeEntitlementsRepository

SESSION_ID = "cs_test_123"


@pytest.fixture
def entitlements():
    return EntitlementsService(FakeEntitlementsRepository())


@pytest.fixture
def billing(entitlements, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_fake")
    monkeypatch.setattr(settings, "stripe_price_id", "price_fake")
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_fake")
    monkeypatch.setattr(settings, "public_site_url", "https://crayoncookout.test")
    return BillingService(entitlements)


@pytest.fixture
def client(billing, entitlements):
    app = create_app()
    app.dependency_overrides[current_user] = lambda: TEST_USER
    app.dependency_overrides[get_billing_service] = lambda: billing
    app.dependency_overrides[get_entitlements_service] = lambda: entitlements
    return TestClient(app)


def completed_event(**overrides):
    session = {
        "id": SESSION_ID,
        "client_reference_id": TEST_USER.id,
        "payment_status": "paid",
        **overrides,
    }
    return {"type": "checkout.session.completed", "data": {"object": session}}


# --- checkout --------------------------------------------------------------


def test_checkout_is_not_configurable_by_the_client(client, billing):
    """No request body: the price is server-side, or a browser could name it."""
    with patch("stripe.checkout.Session.create") as create:
        create.return_value = type("S", (), {"url": "https://checkout.stripe.com/x"})()
        res = client.post("/api/billing/checkout")

    assert res.status_code == 200
    assert res.json()["url"].startswith("https://checkout.stripe.com/")
    kwargs = create.call_args.kwargs
    assert kwargs["line_items"] == [{"price": "price_fake", "quantity": 1}]
    # The identity comes from the session, never from the request.
    assert kwargs["client_reference_id"] == TEST_USER.id
    assert kwargs["mode"] == "payment"
    # A 100%-off promotion code is how a free purchase happens; the alternative
    # is a bypass in our own code, which is a second way to grant entitlements.
    assert kwargs["allow_promotion_codes"] is True


def test_checkout_requires_a_session(anon_client):
    assert anon_client.post("/api/billing/checkout").status_code == 401


def test_checkout_reports_503_when_stripe_is_unconfigured(monkeypatch, entitlements):
    settings = get_settings()
    monkeypatch.setattr(settings, "stripe_secret_key", "")
    monkeypatch.setattr(settings, "stripe_price_id", "")
    with pytest.raises(ServiceUnavailableError):
        BillingService(entitlements).create_checkout_session(TEST_USER.id)


# --- webhook ---------------------------------------------------------------


def test_a_forged_callback_grants_nothing(client, entitlements):
    """The heart of it: no valid signature, no features."""
    res = client.post(
        "/api/billing/webhook",
        content=json.dumps(completed_event()).encode(),
        headers={"stripe-signature": "t=1,v1=not-a-real-signature"},
    )
    assert res.status_code == 422
    assert entitlements.list_features(TEST_USER.id) == []


def test_an_unsigned_callback_grants_nothing(client, entitlements):
    res = client.post("/api/billing/webhook", content=b"{}")
    assert res.status_code == 422
    assert entitlements.list_features(TEST_USER.id) == []


def test_a_verified_payment_grants_the_pass(billing, entitlements):
    with patch("stripe.Webhook.construct_event", return_value=completed_event()):
        assert billing.handle_webhook(b"{}", "sig") == "granted"
    assert sorted(entitlements.list_features(TEST_USER.id)) == ["colouring", "kitchen"]


def test_a_repeated_delivery_grants_once(billing, entitlements):
    """Stripe explicitly reserves the right to deliver an event twice."""
    with patch("stripe.Webhook.construct_event", return_value=completed_event()):
        billing.handle_webhook(b"{}", "sig")
        billing.handle_webhook(b"{}", "sig")
    assert sorted(entitlements.list_features(TEST_USER.id)) == ["colouring", "kitchen"]


def test_an_unpaid_session_grants_nothing(billing, entitlements):
    event = completed_event(payment_status="unpaid")
    with patch("stripe.Webhook.construct_event", return_value=event):
        assert billing.handle_webhook(b"{}", "sig") == "ignored"
    assert entitlements.list_features(TEST_USER.id) == []


def test_a_session_with_no_user_grants_nothing(billing, entitlements):
    event = completed_event(client_reference_id=None)
    with patch("stripe.Webhook.construct_event", return_value=event):
        assert billing.handle_webhook(b"{}", "sig") == "ignored"
    assert entitlements.list_features(TEST_USER.id) == []


def test_other_event_types_are_acknowledged_not_retried(billing):
    """A non-2xx would make Stripe retry an event we never wanted."""
    event = {"type": "payment_intent.created", "data": {"object": {}}}
    with patch("stripe.Webhook.construct_event", return_value=event):
        assert billing.handle_webhook(b"{}", "sig") == "ignored"


def test_webhook_without_a_configured_secret_refuses(monkeypatch, entitlements):
    settings = get_settings()
    monkeypatch.setattr(settings, "stripe_webhook_secret", "")
    with pytest.raises(ServiceUnavailableError):
        BillingService(entitlements).handle_webhook(b"{}", "sig")


def test_verification_failure_does_not_leak_stripe_detail(billing):
    boom = Exception("secret leaked")
    with (
        patch("stripe.Webhook.construct_event", side_effect=boom),
        pytest.raises(ValidationError) as exc,
    ):
        billing.handle_webhook(b"{}", "sig")
    assert "secret leaked" not in str(exc.value)

class FakeStripeSession:
    """Stands in for stripe.checkout.Session.

    The real object is NOT a dict and raises on .get(). The original tests
    mocked plain dicts, so they passed against a webhook that could not work.
    """

    def __init__(self, data):
        self._data = data

    def to_dict(self):
        return dict(self._data)

    def get(self, *_args, **_kwargs):
        raise AttributeError("'get' is a dict method, but a Session is not a dict.")


def completed_event_typed(**overrides):
    """The event shape stripe-python really produces."""
    event = completed_event(**overrides)
    event["data"]["object"] = FakeStripeSession(event["data"]["object"])
    return event


def test_grants_from_a_real_stripe_session_object(billing, entitlements):
    """Regression: the object Stripe hands us is not a dict."""
    with patch("stripe.Webhook.construct_event", return_value=completed_event_typed()):
        assert billing.handle_webhook(b"{}", "sig") == "granted"
    assert sorted(entitlements.list_features(TEST_USER.id)) == ["colouring", "kitchen"]


def test_unpaid_session_object_grants_nothing(billing, entitlements):
    event = completed_event_typed(payment_status="unpaid")
    with patch("stripe.Webhook.construct_event", return_value=event):
        assert billing.handle_webhook(b"{}", "sig") == "ignored"
    assert entitlements.list_features(TEST_USER.id) == []
