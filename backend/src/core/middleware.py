"""
Security and monitoring middleware.
Uses pure ASGI middleware to avoid event loop issues with BaseHTTPMiddleware.
"""

from __future__ import annotations

import time
from typing import TYPE_CHECKING

import structlog
from starlette.responses import JSONResponse

if TYPE_CHECKING:
    from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = structlog.get_logger()


def _extract_client_ip(scope: Scope) -> str:
    """Best-effort client IP extraction respecting X-Forwarded-For."""
    for header_name, header_value in scope.get("headers", []):
        if header_name == b"x-forwarded-for":
            return header_value.decode().split(",")[0].strip()
        if header_name == b"host":
            return header_value.decode()
    return "unknown"


class RateLimitMiddleware:
    """ASGI middleware: Redis-backed sliding-window rate limiter per IP.

    Uses a Redis sorted set so the limit is shared across all workers/instances.
    Each request is scored by timestamp; entries older than the window are pruned
    atomically with a ZREMRANGEBYSCORE + ZADD + ZCARD + EXPIRE pipeline.
    """

    def __init__(
        self,
        app: ASGIApp,
        max_requests: int = 100,
        window_seconds: int = 60,
        redis_key_prefix: str = "rl",
    ) -> None:
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.redis_key_prefix = redis_key_prefix

    async def _get_redis(self):
        from src.core.redis import get_redis

        return await get_redis()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        client_ip = _extract_client_ip(scope)
        key = f"{self.redis_key_prefix}:{client_ip}"
        now = time.time()
        window_start = now - self.window_seconds

        try:
            redis = await self._get_redis()
            # Atomic sliding-window update: prune old, add current, count, set ttl.
            async with redis.pipeline(transaction=False) as pipe:
                pipe.zremrangebyscore(key, 0, window_start)
                pipe.zadd(key, {f"{now}:{id(scope)}": now})
                pipe.zcard(key)
                pipe.expire(key, self.window_seconds + 1)
                results = await pipe.execute()
            current_count = int(results[2] or 0)
        except Exception as exc:
            # If Redis is down, fail open but log — better to serve than 500 every request.
            logger.error("rate_limit_redis_error", error=str(exc), ip=client_ip)
            await self.app(scope, receive, send)
            return

        if current_count >= self.max_requests:
            logger.warning("rate_limit_exceeded", ip=client_ip, count=current_count)
            resp = JSONResponse(
                content={
                    "error": {
                        "message": "Rate limit exceeded",
                        "retry_after_seconds": self.window_seconds,
                    }
                },
                status_code=429,
                headers={"Retry-After": str(self.window_seconds)},
            )
            await resp(scope, receive, send)
            return

        await self.app(scope, receive, send)


class SecurityHeadersMiddleware:
    """ASGI middleware that adds security headers."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-content-type-options", b"nosniff"))
                headers.append((b"x-frame-options", b"DENY"))
                headers.append((b"x-xss-protection", b"1; mode=block"))
                headers.append((b"referrer-policy", b"strict-origin-when-cross-origin"))
                headers.append((b"permissions-policy", b"camera=(), microphone=(), geolocation=()"))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)


class RequestLoggingMiddleware:
    """ASGI middleware that logs requests with timing."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.time()
        method = scope.get("method", "?")
        path = scope.get("path", "/")

        async def send_and_log(message: Message) -> None:
            if message["type"] == "http.response.start":
                elapsed_ms = (time.time() - start) * 1000
                status = message.get("status", 0)
                logger.info(
                    "http_request",
                    method=method,
                    path=path,
                    status=status,
                    duration_ms=round(elapsed_ms, 1),
                )
            await send(message)

        await self.app(scope, receive, send_and_log)
