"""Billing endpoints.

Two routes with opposite trust models. /checkout is called by a signed-in
browser and trusts nothing it sends beyond the identity of the caller. /webhook
is called by Stripe with no session at all, and trusts only a valid signature.
"""
from typing import Annotated

from fastapi import APIRouter, Header, Request
from pydantic import BaseModel

from app.api.deps import BillingDep, CurrentUser

router = APIRouter(prefix="/billing", tags=["billing"])


class CheckoutOut(BaseModel):
    url: str


class WebhookOut(BaseModel):
    status: str


@router.post("/checkout", response_model=CheckoutOut)
def create_checkout(user: CurrentUser, billing: BillingDep) -> CheckoutOut:
    """Start a purchase for the signed-in user.

    No body: what is for sale and what it costs are server-side configuration.
    Accepting a price or a feature list from the client would let a browser name
    its own terms.
    """
    return CheckoutOut(url=billing.create_checkout_session(user.id, user.email))


@router.post("/webhook", response_model=WebhookOut)
async def stripe_webhook(
    request: Request,
    billing: BillingDep,
    stripe_signature: Annotated[str | None, Header()] = None,
) -> WebhookOut:
    """Receive a Stripe event.

    Unauthenticated by necessity -- Stripe has no session -- so the signature is
    the only thing standing between this and free features for anyone who can
    POST. The RAW body is required: any reserialisation changes the bytes and
    invalidates the signature.
    """
    payload = await request.body()
    return WebhookOut(status=billing.handle_webhook(payload, stripe_signature))
