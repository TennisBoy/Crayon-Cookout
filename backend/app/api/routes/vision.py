"""Collectible photo verification endpoint.

Multipart rather than JSON: the client sends the camera file directly, so there
is no base64 round-trip through the browser.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.api.deps import CurrentUser
from app.schemas.vision import VerifyCrayonOut
from app.services.vision_service import VisionService

router = APIRouter(prefix="/vision", tags=["vision"])


def get_vision_service() -> VisionService:
    return VisionService()


@router.post("/verify-crayon", response_model=VerifyCrayonOut)
async def verify_crayon(
    user: CurrentUser,
    service: Annotated[VisionService, Depends(get_vision_service)],
    file: Annotated[UploadFile, File()],
    type: Annotated[str, Form(min_length=1, max_length=64)],
    color: Annotated[str, Form(min_length=1, max_length=64)],
) -> VerifyCrayonOut:
    matched = service.verify_crayon_photo(
        await file.read(),
        file.content_type or "application/octet-stream",
        type,
        color,
    )
    return VerifyCrayonOut(matched=matched)
