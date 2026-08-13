"""Collectibles: verify a photo, then record the unlock.

This service is the reason the vision check exists. Keeping "verify" and
"record" in one server-side operation is what makes the anti-cheat meaningful —
if the client could call "record" directly, photographing anything would be
optional.
"""
from typing import Any

from app.repositories.collectibles_repo import CollectiblesRepository
from app.services.vision_service import VisionService


class CollectiblesService:
    def __init__(
        self,
        repo: CollectiblesRepository | None = None,
        vision: VisionService | None = None,
    ):
        self.repo = repo or CollectiblesRepository()
        self.vision = vision or VisionService()

    def list(self, user_id: str) -> list[str]:
        """Return keys in the `"Set Name/Crayon Name"` form the SPA already uses."""
        return [
            f"{row['set_name']}/{row['crayon_name']}"
            for row in self.repo.list_for_user(user_id)
        ]

    def verify_and_record(
        self,
        user_id: str,
        image_bytes: bytes,
        media_type: str,
        *,
        set_name: str,
        crayon_name: str,
        crayon_type: str,
        color: str,
    ) -> dict[str, Any]:
        """Verify the photo and, only on a match, record the unlock.

        A failed verification records nothing. A vision outage raises, so the
        caller sees an error rather than a silent "no match" that would look
        identical to cheating being caught.
        """
        matched = self.vision.verify_crayon_photo(
            image_bytes, media_type, crayon_type, color
        )
        if matched:
            self.repo.add(user_id, set_name, crayon_name)
        return {"matched": matched, "key": f"{set_name}/{crayon_name}"}
