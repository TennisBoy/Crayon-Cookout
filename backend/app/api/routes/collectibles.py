"""Collectibles endpoints.

`POST /collectibles/verify` deliberately does the verification AND the unlock in
one call. There is no "mark collected" endpoint — if there were, the photo check
would be advisory and the whole mechanic would be honour-system.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel

from app.api.deps import CurrentUser
from app.services.collectibles_service import CollectiblesService

router = APIRouter(prefix="/collectibles", tags=["collectibles"])


class CollectiblesOut(BaseModel):
    """Keys in `"Set Name/Crayon Name"` form, matching the SPA's existing shape."""

    collected: list[str]


class VerifyOut(BaseModel):
    matched: bool
    key: str


def get_collectibles_service() -> CollectiblesService:
    return CollectiblesService()


Service = Annotated[CollectiblesService, Depends(get_collectibles_service)]


@router.get("", response_model=CollectiblesOut)
def list_collectibles(user: CurrentUser, service: Service) -> CollectiblesOut:
    return CollectiblesOut(collected=service.list(user.id))


@router.post("/verify", response_model=VerifyOut)
async def verify_collectible(
    user: CurrentUser,
    service: Service,
    file: Annotated[UploadFile, File()],
    set_name: Annotated[str, Form(min_length=1, max_length=120)],
    crayon_name: Annotated[str, Form(min_length=1, max_length=120)],
    type: Annotated[str, Form(min_length=1, max_length=64)],
    color: Annotated[str, Form(min_length=1, max_length=64)],
) -> VerifyOut:
    result = service.verify_and_record(
        user.id,
        await file.read(),
        file.content_type or "application/octet-stream",
        set_name=set_name,
        crayon_name=crayon_name,
        crayon_type=type,
        color=color,
    )
    return VerifyOut(**result)
