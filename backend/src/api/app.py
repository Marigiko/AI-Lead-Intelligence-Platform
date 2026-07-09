from __future__ import annotations

import time
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from src.api.v1.auth import router as auth_router
from src.api.v1.companies import router as companies_router
from src.api.v1.discovery import router as discovery_router
from src.api.v1.enrichment import router as enrichment_router
from src.api.v1.scoring import router as scoring_router
from src.api.v1.campaigns import router as campaigns_router
from src.api.v1.tracking import router as tracking_router
from src.api.v1.conversations import router as conversations_router
from src.api.v1.deals import router as deals_router
from src.api.v1.analytics import router as analytics_router
from src.core.config import get_settings
from src.core.database import close_db, init_db
from src.core.events import get_event_bus
from src.core.exceptions import AppError
from src.core.middleware import RateLimitMiddleware, SecurityHeadersMiddleware, RequestLoggingMiddleware
from src.core.redis import close_redis, get_redis
from src.infrastructure.scraping.engine import get_browser_pool

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    settings = get_settings()
    logger.info("starting_app", environment=settings.environment)

    # Import all models so SQLAlchemy registers them with Base.metadata
    from src.domain.tenant.models import Tenant  # noqa: F401
    from src.domain.user.models import User  # noqa: F401
    from src.domain.company.models import Company, CompanySource  # noqa: F401
    from src.domain.contact.models import Contact  # noqa: F401
    from src.domain.campaign.models import Campaign, CampaignLead, MessageTemplate  # noqa: F401
    from src.domain.conversation.models import Conversation, ConversationMessage  # noqa: F401
    from src.domain.deal.models import Deal, Activity, PipelineStage  # noqa: F401

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

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        openapi_url="/api/v1/openapi.json" if settings.debug else None,
        docs_url="/api/v1/docs" if settings.debug else None,
        redoc_url="/api/v1/redoc" if settings.debug else None,
        default_response_class=ORJSONResponse,
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
    async def add_timing_header(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Response-Time"] = f"{elapsed_ms:.1f}ms"
        return response

    # Global exception handler
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return ORJSONResponse(
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
    async def health():
        return {"status": "ok", "version": "0.1.0"}

    @app.get("/api/v1/health")
    async def api_health():
        try:
            redis = await get_redis()
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
