"""Stripe Checkout and the webhook that grants what was paid for.

The split matters. Checkout is started by the browser, so nothing it says can
be trusted: the price comes from configuration, never from the request, or a
client could buy a $10 pass for $0.01. The GRANT happens only in the webhook,
which Stripe calls server-to-server and signs, so it is the only statement
about payment this app believes.
"""
import logging

from app.config import get_settings
from app.core.errors import ServiceUnavailableError, UpstreamError, ValidationError
from app.services.catalog import BY_ID, CURRENCY, DISPATCH_BY, MAX_ITEMS, MAX_PER_PACK
from app.services.entitlements_service import EntitlementsService

logger = logging.getLogger(__name__)

# What the pass grants. Kept here rather than in Stripe metadata so a change in
# the dashboard cannot widen what a purchase unlocks.
PASS_FEATURES = ("kitchen", "colouring")

CHECKOUT_COMPLETED = "checkout.session.completed"


class BillingService:
    def __init__(self, entitlements: EntitlementsService | None = None):
        self.entitlements = entitlements or EntitlementsService()

    def _stripe(self):
        settings = get_settings()
        if not settings.stripe_configured:
            raise ServiceUnavailableError(
                "Purchases are not configured on this server.",
                detail="STRIPE_SECRET_KEY / STRIPE_PRICE_ID are unset",
            )
        import stripe

        stripe.api_key = settings.stripe_secret_key
        return stripe

    # --- Checkout ----------------------------------------------------------

    def create_checkout_session(self, user_id: str, email: str | None = None) -> str:
        """Return the URL of a hosted Checkout page.

        `client_reference_id` carries the user id to the webhook. It is the
        only link between a payment and an account, and it is set here rather
        than accepted from the client for the obvious reason.
        """
        settings = get_settings()
        stripe = self._stripe()
        try:
            session = stripe.checkout.Session.create(
                mode="payment",
                line_items=[{"price": settings.stripe_price_id, "quantity": 1}],
                client_reference_id=user_id,
                customer_email=email or None,
                # Lets a 100%-off promotion code make a purchase free without a
                # bypass in our own code. The payment still goes through Stripe
                # and the webhook still does the granting, so a comp follows the
                # same path as a sale and shows up in Stripe's records.
                allow_promotion_codes=True,
                success_url=f"{settings.site_url}/cart?checkout=success",
                cancel_url=f"{settings.site_url}/shop?checkout=cancelled",
            )
        except Exception as exc:  # noqa: BLE001 - stripe raises a wide family
            raise UpstreamError(detail=f"checkout session failed: {exc}") from exc

        if not session.url:
            raise UpstreamError(detail="stripe returned no checkout url")
        return session.url

    # --- Pre-orders --------------------------------------------------------

    def create_preorder_session(
        self, user_id: str, basket: dict[str, int], email: str | None = None
    ) -> str:
        """Reserve packs without taking any money.

        Setup mode: Checkout saves a card and a shipping address against a
        Customer and charges nothing. The card is charged by hand at dispatch.

        Manual capture would be the obvious alternative and does not work here:
        a card authorisation expires in about a week, and dispatch is further
        out than that.
        """
        settings = get_settings()
        stripe = self._stripe()

        lines = self._price_basket(basket)
        total = sum(line["subtotal"] for line in lines)
        summary = ", ".join(f"{line['name']} x{line['qty']}" for line in lines)

        try:
            session = stripe.checkout.Session.create(
                mode="setup",
                currency=CURRENCY,
                customer_creation="always",
                customer_email=email or None,
                client_reference_id=user_id,
                # Canada only, for now.
                shipping_address_collection={"allowed_countries": ["CA"]},
                # This is the fulfilment record while there is no orders table:
                # what to send, to whom, and what to charge when it ships.
                metadata={
                    "kind": "preorder",
                    "packs": summary[:450],
                    "total_cents": str(total),
                    "currency": CURRENCY,
                    "dispatch_by": DISPATCH_BY,
                    "user_id": user_id,
                },
                success_url=f"{settings.site_url}/cart?preorder=placed",
                cancel_url=f"{settings.site_url}/cart",
            )
        except Exception as exc:  # noqa: BLE001 - stripe raises a wide family
            raise UpstreamError(detail=f"preorder session failed: {exc}") from exc

        if not session.url:
            raise UpstreamError(detail="stripe returned no checkout url")
        return session.url

    def quote_basket(self, basket: dict[str, int]) -> dict:
        """What a basket costs, priced by the server.

        The UI shows this before asking for a card, so the promise on screen and
        the charge at dispatch come from one place.
        """
        lines = self._price_basket(basket)
        return {
            "lines": lines,
            "total_cents": sum(line["subtotal"] for line in lines),
            "currency": CURRENCY,
            "dispatch_by": DISPATCH_BY,
        }

    @staticmethod
    def _price_basket(basket: dict[str, int]) -> list[dict]:
        """Resolve ids and quantities to names and prices.

        Prices are never taken from the request. A basket arrives as ids and
        counts; everything chargeable comes from the server catalog.
        """
        if not basket:
            raise ValidationError("Your cart is empty.")

        lines = []
        items = 0
        for pack_id, qty in basket.items():
            pack = BY_ID.get(pack_id)
            if pack is None:
                raise ValidationError("That pack is not for sale.")
            if not isinstance(qty, int) or qty < 1 or qty > MAX_PER_PACK:
                raise ValidationError(
                    f"Choose between 1 and {MAX_PER_PACK} of each pack."
                )
            items += qty
            lines.append(
                {
                    "id": pack.id,
                    "name": pack.name,
                    "qty": qty,
                    "price_cents": pack.price_cents,
                    "subtotal": pack.price_cents * qty,
                }
            )

        if items > MAX_ITEMS:
            raise ValidationError(f"That is more than {MAX_ITEMS} packs in one order.")
        return lines

    # --- Webhook -----------------------------------------------------------

    def handle_webhook(self, payload: bytes, signature: str | None) -> str:
        """Verify a Stripe callback and grant on a completed payment.

        Signature verification is the whole security model: without it this
        endpoint is an unauthenticated "give me features for free" button.
        """
        settings = get_settings()
        if not settings.stripe_webhook_secret:
            raise ServiceUnavailableError(
                "Webhooks are not configured on this server.",
                detail="STRIPE_WEBHOOK_SECRET is unset",
            )

        import stripe

        try:
            event = stripe.Webhook.construct_event(
                payload, signature or "", settings.stripe_webhook_secret
            )
        except Exception as exc:  # noqa: BLE001 - bad signature or bad payload
            # Deliberately vague to the caller; the detail goes to the log only.
            raise ValidationError("That callback could not be verified.") from exc

        if event["type"] != CHECKOUT_COMPLETED:
            # Stripe may send events we never subscribed to. Acknowledging them
            # is correct: a non-2xx makes Stripe retry something we will never
            # want.
            return "ignored"

        # stripe-python returns typed resources, not dicts: `Session.get` raises
        # rather than reading a field. Normalising here keeps the rest of this
        # method working on plain data -- and is exactly the difference between
        # what the unit tests mocked and what Stripe actually sends.
        raw = event["data"]["object"]
        session = raw if isinstance(raw, dict) else raw.to_dict()

        # A pre-order completes this same event in setup mode and pays nothing.
        # The payment_status check below would catch it, but relying on that
        # would make "pre-orders grant nothing" an accident rather than a rule.
        if session.get("mode") == "setup":
            logger.info("preorder reserved: %s", session.get("id"))
            return "preorder"

        user_id = session.get("client_reference_id")
        if not user_id:
            logger.warning("checkout.session.completed with no client_reference_id")
            return "ignored"

        # Unpaid sessions can complete; only a paid one grants anything.
        if session.get("payment_status") != "paid":
            logger.info("checkout completed but unpaid: %s", session.get("id"))
            return "ignored"

        reference = session.get("id")
        for feature in PASS_FEATURES:
            # The reference is per feature so the partial unique index does not
            # collide when one session grants two of them.
            self.entitlements.grant(
                user_id,
                feature,
                source="purchase",
                reference=f"{reference}:{feature}",
            )
        logger.info("granted %s to %s", PASS_FEATURES, user_id)
        return "granted"
