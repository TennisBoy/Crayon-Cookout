"""Collectible photo verification.

This is the anti-cheat for the collectibles mechanic: a child photographs a
physical shaped crayon they own, and the model confirms it matches the expected
shape and colour. It runs server-side precisely so the API key never reaches a
browser — that was the whole reason this could not stay in the frontend.

Unconfigured, it raises 503 rather than returning `{"matched": false}`. A stub
that silently answers "no" would look like a working anti-cheat while verifying
nothing.
"""
import base64
import json
import logging

from app.config import get_settings
from app.core.errors import ServiceUnavailableError, UpstreamError, ValidationError

logger = logging.getLogger(__name__)

ALLOWED_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

PROMPT = (
    "Look at this image and determine whether it shows a physical crayon "
    "shaped like a {type} that is {color} in colour.\n"
    "Judge only the crayon itself; ignore background, hands and packaging.\n"
    "If the image does not clearly show a crayon of that shape and colour, "
    "answer false.\n"
    'Reply with JSON only, in the form {{"matched": true}} or {{"matched": false}}.'
)


class VisionService:
    def __init__(self):
        self.settings = get_settings()

    def verify_crayon_photo(
        self, image_bytes: bytes, media_type: str, crayon_type: str, color: str
    ) -> bool:
        if not self.settings.vision_configured:
            raise ServiceUnavailableError(
                "Photo scanning is not available on this server yet.",
                detail="ANTHROPIC_API_KEY is unset",
            )
        if media_type not in ALLOWED_MEDIA_TYPES:
            raise ValidationError(
                "Please upload a JPEG, PNG, WebP or GIF image."
            )
        if not image_bytes:
            raise ValidationError("The uploaded image was empty.")
        if len(image_bytes) > self.settings.vision_max_upload_bytes:
            mb = self.settings.vision_max_upload_bytes // (1024 * 1024)
            raise ValidationError(f"Images must be smaller than {mb}MB.")

        try:
            from anthropic import Anthropic

            client = Anthropic(api_key=self.settings.anthropic_api_key)
            response = client.messages.create(
                model=self.settings.vision_model,
                max_tokens=64,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": base64.b64encode(image_bytes).decode(),
                                },
                            },
                            {
                                "type": "text",
                                "text": PROMPT.format(type=crayon_type, color=color),
                            },
                        ],
                    }
                ],
            )
        except Exception as exc:  # noqa: BLE001
            raise UpstreamError(
                "Photo scanning is temporarily unavailable.",
                detail=f"vision call failed: {exc}",
            ) from exc

        return self._parse_matched(
            "".join(b.text for b in response.content if b.type == "text")
        )

    @staticmethod
    def _parse_matched(text: str) -> bool:
        """Read the model's verdict.

        Anything we cannot parse is treated as "not matched" — failing closed
        is correct for an anti-cheat.
        """
        raw = text.strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            raw = raw.split("\n", 1)[-1] if "\n" in raw else raw
            raw = raw.rsplit("```", 1)[0]
        try:
            start, end = raw.index("{"), raw.rindex("}") + 1
            return bool(json.loads(raw[start:end]).get("matched", False))
        except (ValueError, json.JSONDecodeError, AttributeError):
            logger.warning("Unparseable vision verdict: %r", text[:200])
            return False
