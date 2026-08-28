"""Pre-orders: reserve packs now, charge at dispatch.

Two properties matter. Prices come from the server, because a price sent by the
browser is a price the customer chose. And a pre-order grants nothing — it takes
no money, so it must not unlock anything either.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.api.deps import current_user, get_billing_service
from app.config import get_settings
from app.core.errors import ValidationError
from app.main import create_app
from app.services.billing_service import BillingService
from app.services.catalog import BY_ID, DISPATCH_BY, MAX_PER_PACK
from app.services.entitlements_service import EntitlementsService
from tests.conftest import TEST_USER
from tests.test_entitlements import FakeEntitlementsRepository

BASKET = {"meow-mix-6": 2, "turtle-time-12": 1}
EXPECTED_TOTAL = 299 * 2 + 549


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
def client(billing):
    app = create_app()
    app.dependency_overrides[current_user] = lambda: TEST_USER
    app.dependency_overrides[get_billing_service] = lambda: billing
    return TestClient(app)


# --- pricing ---------------------------------------------------------------


def test_the_server_prices_the_basket(billing):
    quote = billing.quote_basket(BASKET)
    assert quote["total_cents"] == EXPECTED_TOTAL
    assert quote["dispatch_by"] == DISPATCH_BY
    assert quote["currency"] == "cad"


def test_a_twelve_undercuts_two_sixes(billing):
    """The 12 is the offer. If it ever costs more, buying it is a penalty.

    The saving is 49c rather than a round 50 because $5.49 is the shelf price
    we chose; the shelf advertises the 49 it actually gives.
    """
    for pack in BY_ID.values():
        if not pack.id.endswith("-12"):
            continue
        six = BY_ID[pack.id[: -len("-12")] + "-6"]
        assert six.price_cents * 2 - pack.price_cents == 49, pack.id


def test_a_price_sent_by_the_client_is_ignored(client):
    """The body carries ids and counts. There is nowhere to put a price."""
    res = client.post(
        "/api/billing/preorder/quote",
        json={"basket": {"meow-mix-6": 1}, "total_cents": 1, "price": 1},
    )
    assert res.status_code == 200
    assert res.json()["total_cents"] == BY_ID["meow-mix-6"].price_cents


def test_an_unknown_pack_is_refused(billing):
    with pytest.raises(ValidationError):
        billing.quote_basket({"free-crayons": 1})


def test_an_empty_basket_is_refused(billing):
    with pytest.raises(ValidationError):
        billing.quote_basket({})


@pytest.mark.parametrize("qty", [0, -1, MAX_PER_PACK + 1])
def test_absurd_quantities_are_refused(billing, qty):
    """A stuck button must not commit a child to hundreds of packs."""
    with pytest.raises(ValidationError):
        billing.quote_basket({"meow-mix-6": qty})


def test_too_many_packs_overall_is_refused(billing):
    with pytest.raises(ValidationError):
        billing.quote_basket({p: 20 for p in list(BY_ID)[:4]})


# --- the session -----------------------------------------------------------


def test_a_preorder_takes_no_money(billing):
    with patch("stripe.checkout.Session.create") as create:
        create.return_value = type("S", (), {"url": "https://checkout.stripe.com/x"})()
        billing.create_preorder_session(TEST_USER.id, BASKET, "kid@example.com")

    kwargs = create.call_args.kwargs
    # Setup mode saves a card and charges nothing. Manual capture would expire
    # long before dispatch.
    assert kwargs["mode"] == "setup"
    assert "line_items" not in kwargs
    assert kwargs["shipping_address_collection"] == {"allowed_countries": ["CA"]}
    assert kwargs["client_reference_id"] == TEST_USER.id


def test_the_session_carries_what_to_ship_and_charge(billing):
    """With no orders table, Stripe's metadata IS the fulfilment record."""
    with patch("stripe.checkout.Session.create") as create:
        create.return_value = type("S", (), {"url": "https://checkout.stripe.com/x"})()
        billing.create_preorder_session(TEST_USER.id, BASKET)

    meta = create.call_args.kwargs["metadata"]
    assert meta["kind"] == "preorder"
    assert meta["total_cents"] == str(EXPECTED_TOTAL)
    assert "Meow Mix 6-pack x2" in meta["packs"]
    assert meta["dispatch_by"] == DISPATCH_BY


def test_preorder_requires_a_session(anon_client):
    res = anon_client.post("/api/billing/preorder", json={"basket": BASKET})
    assert res.status_code == 401


# --- the webhook -----------------------------------------------------------


def test_a_preorder_grants_nothing(billing, entitlements):
    """It takes no money, so it must unlock nothing."""
    event = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_setup_1",
                "mode": "setup",
                "client_reference_id": TEST_USER.id,
                "payment_status": "no_payment_required",
            }
        },
    }
    with patch("stripe.Webhook.construct_event", return_value=event):
        assert billing.handle_webhook(b"{}", "sig") == "preorder"
    assert entitlements.list_features(TEST_USER.id) == []
