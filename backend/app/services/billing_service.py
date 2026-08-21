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
                success_url=f"{settings.site_url}/cart?checkout=success",
                cancel_url=f"{settings.site_url}/shop?checkout=cancelled",
            )
        except Exception as exc:  # noqa: BLE001 - stripe raises a wide family
            raise UpstreamError(detail=f"checkout session failed: {exc}") from exc

        if not session.url:
            raise UpstreamError(detail="stripe returned no checkout url")
        return session.url

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

        session = event["data"]["object"]
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
