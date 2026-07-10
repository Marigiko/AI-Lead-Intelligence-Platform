from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING, Any

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from src.api.v1.analytics import router as analytics_router
from src.api.v1.auth import router as auth_router
from src.api.v1.campaigns import router as campaigns_router
from src.api.v1.companies import router as companies_router
from src.api.v1.conversations import router as conversations_router
from src.api.v1.deals import router as deals_router
from src.api.v1.discovery import router as discovery_router
from src.api.v1.enrichment import router as enrichment_router
from src.api.v1.scoring import router as scoring_router
from src.api.v1.tracking import router as tracking_router
from src.core.config import get_settings
from src.core.database import close_db, init_db
from src.core.events import get_event_bus
from src.core.exceptions import AppError
from src.core.middleware import (
    RateLimitMiddleware,
    RequestLoggingMiddleware,
    SecurityHeadersMiddleware,
)
from src.core.redis import close_redis, get_redis
from src.infrastructure.scraping.engine import get_browser_pool

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable

logger = structlog.get_logger()

_INSECURE_DEFAULTS = ("change-me-in-production", "secret", "password", "admin")


def _validate_production_settings(settings: Any) -> None:
    import sys

    errors: list[str] = []
    if settings.secret_key in _INSECURE_DEFAULTS:
        errors.append("SECRET_KEY must be set to a secure random value")
    if settings.jwt_secret_key in _INSECURE_DEFAULTS:
        errors.append("JWT_SECRET_KEY must be set to a secure random value")
    if errors:
        for err in errors:
            logger.critical("insecure_config", error=err)
        print(
            "FATAL: Insecure configuration detected:\n  - " + "\n  - ".join(errors),
            file=sys.stderr,
        )
        sys.exit(1)


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    """Startup / shutdown lifecycle."""
    settings = get_settings()
    logger.info("starting_app", environment=settings.environment)

    # Import all models so SQLAlchemy registers them with Base.metadata
    import importlib

    for mod_name in (
        "src.domain.campaign.models",
        "src.domain.company.models",
        "src.domain.contact.models",
        "src.domain.conversation.models",
        "src.domain.deal.models",
        "src.domain.tenant.models",
        "src.domain.user.models",
    ):
        importlib.import_module(mod_name)

    # Initialize infrastructure
    await init_db()
    await get_redis()
    get_event_bus()  # Initialize event bus

    logger.info("app_started")
    yield

    # Shutdown
    pool = get_browser_pool()
    await pool.stop()
    await close_db()
    await close_redis()
    logger.info("app_stopped")


def create_app() -> FastAPI:
    settings = get_settings()

    if settings.is_production:
        _validate_production_settings(settings)

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        openapi_url="/api/v1/openapi.json" if settings.debug else None,
        docs_url="/api/v1/docs" if settings.debug else None,
        redoc_url="/api/v1/redoc" if settings.debug else None,
        default_response_class=JSONResponse,
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Security & monitoring middleware
    app.add_middleware(SecurityHeadersMiddleware)
    if settings.is_production:
        app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
    app.add_middleware(RequestLoggingMiddleware)

    # Request timing middleware
    @app.middleware("http")
    async def add_timing_header(  # pyright: ignore[reportUnusedFunction]
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Response-Time"] = f"{elapsed_ms:.1f}ms"
        return response

    # Global exception handler
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:  # noqa: ARG001  # pyright: ignore[reportUnusedFunction]
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "message": exc.message,
                    "status_code": exc.status_code,
                    "detail": exc.detail,
                }
            },
        )

    # Routers
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(companies_router, prefix="/api/v1")
    app.include_router(discovery_router, prefix="/api/v1")
    app.include_router(enrichment_router, prefix="/api/v1")
    app.include_router(scoring_router, prefix="/api/v1")
    app.include_router(campaigns_router, prefix="/api/v1")
    app.include_router(tracking_router, prefix="/api/v1")
    app.include_router(conversations_router, prefix="/api/v1")
    app.include_router(deals_router, prefix="/api/v1")
    app.include_router(analytics_router, prefix="/api/v1")

    # Health check
    @app.get("/health")
    async def health() -> dict[str, str]:  # pyright: ignore[reportUnusedFunction]
        return {"status": "ok", "version": "0.1.0"}

    @app.get("/api/v1/health")
    async def api_health() -> dict[str, Any]:  # pyright: ignore[reportUnusedFunction]
        try:
            redis: Any = await get_redis()
            await redis.ping()
            redis_ok = True
        except Exception:
            redis_ok = False

        return {
            "status": "healthy" if redis_ok else "degraded",
            "version": "0.1.0",
            "checks": {
                "redis": "ok" if redis_ok else "error",
            },
        }

    return app


app = create_app()
