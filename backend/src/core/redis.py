from __future__ import annotations

import redis.asyncio as redis

from src.core.config import get_settings

_pool: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = redis.from_url(  # type: ignore[no-untyped-call]
            str(settings.redis_url),
            decode_responses=True,
            max_connections=20,
        )
    return _pool


async def close_redis() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
