"""Vision response shapes."""
from pydantic import BaseModel


class VerifyCrayonOut(BaseModel):
    """Matches what `lib/adapters/vision.js` destructures: `{ matched }`."""

    matched: bool
