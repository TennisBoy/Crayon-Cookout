"""What a user is allowed to use.

The list of features lives here rather than in the database or the client: the
schema constrains what may be stored, this constrains what may be granted, and
the frontend only ever reads the result.
"""
from app.core.errors import ValidationError
from app.repositories.entitlements_repo import EntitlementsRepository

# Kept in step with entitlements_known_feature in supabase/schema.sql.
SELLABLE_FEATURES = ("kitchen", "colouring")


class EntitlementsService:
    def __init__(self, repo: EntitlementsRepository | None = None):
        self.repo = repo or EntitlementsRepository()

    def list_features(self, user_id: str) -> list[str]:
        """Feature names this user owns. The shape the SPA gates on."""
        return [row["feature"] for row in self.repo.list_for_user(user_id)]

    def grant(
        self,
        user_id: str,
        feature: str,
        *,
        source: str = "purchase",
        reference: str | None = None,
    ) -> list[str]:
        """Grant one feature and return the full resulting set.

        Returning everything rather than the single grant means a caller never
        has to merge state itself, and a repeat webhook produces an identical
        response instead of an error.
        """
        if feature not in SELLABLE_FEATURES:
            raise ValidationError(f"{feature} is not a purchasable feature.")
        self.repo.grant(user_id, feature, source=source, reference=reference)
        return self.list_features(user_id)
