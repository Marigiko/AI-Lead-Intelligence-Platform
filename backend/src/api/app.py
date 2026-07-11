from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING, Any

import structlog
from fastapi import FastAPI, Request
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
        "src.domain.audit.models",
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
    if settings.environment != "testing":
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

    testing = settings.environment == "testing"
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        openapi_url="/api/v1/openapi.json" if settings.debug else None,
        docs_url="/api/v1/docs" if settings.debug else None,
        redoc_url="/api/v1/redoc" if settings.debug else None,
        default_response_class=JSONResponse,
        lifespan=None if testing else lifespan,
    )

    # CORS (pure ASGI to avoid event loop issues)
    wrapped = _CORSMiddleware(
        SecurityHeadersMiddleware(
            RateLimitMiddleware(RequestLoggingMiddleware(app), max_requests=100, window_seconds=60)
            if settings.is_production
            else RequestLoggingMiddleware(app)
        ),
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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

    return _FastAPIAppWrapper(app, wrapped)  # pyright: ignore[reportReturnType]


class _FastAPIAppWrapper:
    """Exposes FastAPI app interface on top of a wrapped ASGI app."""

    def __init__(self, fastapi_app: FastAPI, wrapped: Any) -> None:
        object.__setattr__(self, "_fastapi_app", fastapi_app)
        object.__setattr__(self, "_wrapped", wrapped)

    def __getattr__(self, name: str) -> Any:
        return getattr(object.__getattribute__(self, "_fastapi_app"), name)

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        await object.__getattribute__(self, "_wrapped")(scope, receive, send)


class _CORSMiddleware:
    """Pure ASGI CORS middleware (avoids BaseHTTPMiddleware event loop issues)."""

    def __init__(
        self,
        app,
        allow_origins: list[str] | None = None,
        allow_credentials: bool = True,
        allow_methods: list[str] | None = None,
        allow_headers: list[str] | None = None,
    ) -> None:
        self.app = app
        self.allow_origins = allow_origins or ["*"]
        self.allow_credentials = allow_credentials
        self.allow_methods = allow_methods or ["*"]
        self.allow_headers = allow_headers or ["*"]

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        origin = ""
        for header_name, header_value in scope.get("headers", []):
            if header_name == b"origin":
                origin = header_value.decode()
                break

        allowed = "*" in self.allow_origins or origin in self.allow_origins

        if scope["method"] == "OPTIONS" and allowed:
            await self._send_cors_response(send)
            return

        async def send_with_cors(message):
            if message["type"] == "http.response.start" and allowed:
                headers = list(message.get("headers", []))
                headers.append((b"access-control-allow-origin", origin.encode() or b"*"))
                if self.allow_credentials:
                    headers.append((b"access-control-allow-credentials", b"true"))
                headers.append(
                    (b"access-control-allow-methods", ", ".join(self.allow_methods).encode())
                )
                headers.append(
                    (b"access-control-allow-headers", ", ".join(self.allow_headers).encode())
                )
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_cors)

    async def _send_cors_response(self, send):
        await send(
            {
                "type": "http.response.start",
                "status": 204,
                "headers": [
                    (b"access-control-allow-origin", b"*"),
                    (b"access-control-allow-credentials", b"true"),
                    (
                        b"access-control-allow-methods",
                        ", ".join(self.allow_methods).encode(),
                    ),
                    (
                        b"access-control-allow-headers",
                        ", ".join(self.allow_headers).encode(),
                    ),
                    (b"content-length", b"0"),
                ],
            }
        )
        await send({"type": "http.response.body", "body": b""})


app = create_app()
