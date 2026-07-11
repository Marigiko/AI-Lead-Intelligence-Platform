"""
Security and monitoring middleware.
Uses pure ASGI middleware to avoid event loop issues with BaseHTTPMiddleware.
"""

from __future__ import annotations

import time
from collections import defaultdict

import structlog
from starlette.responses import JSONResponse

logger = structlog.get_logger()


class RateLimitMiddleware:
    """ASGI middleware: simple in-memory rate limiter per IP."""

    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        client_ip = "unknown"
        for header_name, header_value in scope.get("headers", []):
            if header_name == b"x-forwarded-for":
                client_ip = header_value.decode().split(",")[0].strip()
                break
            if header_name == b"host":
                client_ip = header_value.decode()

        now = time.time()
        self._requests[client_ip] = [
            t for t in self._requests[client_ip] if now - t < self.window_seconds
        ]

        if len(self._requests[client_ip]) >= self.max_requests:
            logger.warning("rate_limit_exceeded", ip=client_ip)
            resp = JSONResponse(
                content={"error": {"message": "Rate limit exceeded"}},
                status_code=429,
            )
            await resp(scope, receive, send)
            return

        self._requests[client_ip].append(now)
        await self.app(scope, receive, send)


class SecurityHeadersMiddleware:
    """ASGI middleware that adds security headers."""

    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
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

    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.time()
        method = scope.get("method", "?")
        path = scope.get("path", "/")

        async def send_and_log(message):
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
