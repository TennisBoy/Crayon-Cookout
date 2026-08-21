"""Entitlement endpoints.

Read-only on purpose. Nothing here grants anything: a client that could grant
its own entitlements would make paying optional, which is the exact bug this
table exists to close. Grants happen in the Stripe webhook, server to server.
"""
from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import CurrentUser, EntitlementsDep

router = APIRouter(prefix="/entitlements", tags=["entitlements"])


class EntitlementsOut(BaseModel):
    features: list[str]


@router.get("", response_model=EntitlementsOut)
def list_entitlements(user: CurrentUser, service: EntitlementsDep) -> EntitlementsOut:
    return EntitlementsOut(features=service.list_features(user.id))
