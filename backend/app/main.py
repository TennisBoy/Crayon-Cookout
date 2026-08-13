"""FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, designs, health, vision
from app.config import get_settings
from app.core.errors import register_exception_handlers

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Starting in %s mode", settings.environment)
    if not settings.supabase_configured:
        logger.warning(
            "Supabase is not configured — auth and designs will return 503. "
            "See docs/supabase-setup.md."
        )
    if not settings.vision_configured:
        logger.warning(
            "ANTHROPIC_API_KEY is unset — collectible scanning will return 503."
        )
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Crayon Cookout API",
        version="1.0.0",
        lifespan=lifespan,
        # Interactive docs are useful in development and an unnecessary
        # information leak in production.
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )

    # Exact origins only — see the validator in config.py, which rejects "*".
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=600,
    )

    register_exception_handlers(app)

    for router in (health.router, auth.router, designs.router, vision.router):
        app.include_router(router, prefix=settings.api_prefix)

    return app


app = create_app()
