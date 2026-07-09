"""
Per-source rate limiting using Redis令牌桶.
"""
from __future__ import annotations

import asyncio
import time

import structlog

logger = structlog.get_logger()


class RateLimiter:
    """Token bucket rate limiter per source."""

    def __init__(self, requests_per_minute: int = 30, burst: int = 5) -> None:
        self._rpm = requests_per_minute
        self._burst = burst
        self._tokens = float(burst)
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_refill
            # Refill tokens
            self._tokens = min(
                self._burst,
                self._tokens + elapsed * (self._rpm / 60.0),
            )
            self._last_refill = now

            if self._tokens < 1:
                wait_time = (1 - self._tokens) / (self._rpm / 60.0)
                logger.debug("rate_limit_wait", wait_seconds=round(wait_time, 2))
                await asyncio.sleep(wait_time)
                self._tokens = 1.0
                self._last_refill = time.monotonic()

            self._tokens -= 1


class RateLimiterRegistry:
    """Manages rate limiters per source."""

    def __init__(self) -> None:
        self._limiters: dict[str, RateLimiter] = {}

    def get(self, source: str, rpm: int = 30, burst: int = 5) -> RateLimiter:
        if source not in self._limiters:
            self._limiters[source] = RateLimiter(requests_per_minute=rpm, burst=burst)
        return self._limiters[source]


# Singleton
_registry: RateLimiterRegistry | None = None


def get_rate_limiter_registry() -> RateLimiterRegistry:
    global _registry
    if _registry is None:
        _registry = RateLimiterRegistry()
    return _registry
