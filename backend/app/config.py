"""Application configuration.

Every setting comes from the environment. Nothing here has a secret as its
default — a missing secret must fail loudly at startup rather than silently
running with a placeholder.
"""
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Runtime -----------------------------------------------------------
    environment: Literal["development", "production"] = "production"
    log_level: str = "INFO"
    api_prefix: str = "/api"

    # --- Supabase ----------------------------------------------------------
    # The service role key bypasses row-level security. It must NEVER reach the
    # browser; it lives only in the backend container's environment.
    supabase_url: str = Field(default="", description="https://<ref>.supabase.co")
    supabase_service_role_key: str = Field(default="")
    supabase_anon_key: str = Field(default="")

    # --- CORS --------------------------------------------------------------
    # Comma-separated list of exact origins. No wildcard in production.
    cors_origins: str = "http://localhost:5173"

    # --- Vision ------------------------------------------------------------
    # Collectible photo verification. Optional: without a key the endpoint
    # returns 503 rather than pretending to verify.
    anthropic_api_key: str = Field(default="")
    vision_model: str = "claude-sonnet-4-5"
    vision_max_upload_bytes: int = 8 * 1024 * 1024

    @field_validator("cors_origins")
    @classmethod
    def _no_wildcard_origin(cls, v: str) -> str:
        if "*" in v:
            raise ValueError(
                "CORS_ORIGINS must list exact origins; '*' is unsafe with credentials"
            )
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def vision_configured(self) -> bool:
        return bool(self.anthropic_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
