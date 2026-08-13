"""Design business rules.

Thin on purpose — designs are mostly CRUD. The rules that do exist live here
rather than in the route or the repository.
"""
from typing import Any

from app.core.errors import ValidationError
from app.repositories.designs_repo import DesignsRepository
from app.schemas.design import DesignCreate, DesignUpdate

MAX_DESIGNS_PER_USER = 500
MAX_LIST_LIMIT = 100


class DesignsService:
    def __init__(self, repo: DesignsRepository | None = None):
        self.repo = repo or DesignsRepository()

    def list(
        self, user_id: str, *, sort: str = "-created_date", limit: int = 50
    ) -> list[dict[str, Any]]:
        return self.repo.list_for_user(
            user_id, sort=sort, limit=min(max(limit, 1), MAX_LIST_LIMIT)
        )

    def create(self, user_id: str, payload: DesignCreate) -> dict[str, Any]:
        # A crayon is a stack of coloured segments; one height per colour.
        if len(payload.colors) != len(payload.heights):
            raise ValidationError(
                "Each colour needs a matching height "
                f"({len(payload.colors)} colours, {len(payload.heights)} heights)."
            )
        if any(h <= 0 for h in payload.heights):
            raise ValidationError("Segment heights must be greater than zero.")

        existing = self.repo.list_for_user(user_id, limit=MAX_DESIGNS_PER_USER)
        if len(existing) >= MAX_DESIGNS_PER_USER:
            raise ValidationError(
                f"You have reached the limit of {MAX_DESIGNS_PER_USER} saved designs."
            )

        return self.repo.create(user_id, payload.model_dump())

    def update(
        self, design_id: str, user_id: str, patch: DesignUpdate
    ) -> dict[str, Any]:
        data = patch.model_dump(exclude_unset=True)
        if not data:
            raise ValidationError("No fields to update.")

        colors, heights = data.get("colors"), data.get("heights")
        if (colors is None) != (heights is None):
            raise ValidationError("Colours and heights must be updated together.")
        if colors is not None and len(colors) != len(heights):
            raise ValidationError("Each colour needs a matching height.")

        if data.get("is_competition_entry") and not data.get("competition_email"):
            current = self.repo.get(design_id, user_id)
            if not current.get("competition_email"):
                raise ValidationError(
                    "A contact email is required to enter the competition."
                )

        return self.repo.update(design_id, user_id, data)

    def delete(self, design_id: str, user_id: str) -> None:
        self.repo.delete(design_id, user_id)
