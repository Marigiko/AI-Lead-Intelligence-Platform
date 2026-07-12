"""
Cache infrastructure — high-level Redis cache wrapper.
Provides get/set/delete with TTL, JSON serialization, and namespacing.
"""

from __future__ import annotations

import json
from typing import Any

from src.core.redis import get_redis

DEFAULT_TTL = 3600  # 1 hour


async def cache_get(key: str) -> Any | None:
    """Get a cached value by key. Returns None if not found."""
    r = await get_redis()
    data = await r.get(f"cache:{key}")
    if data is None:
        return None
    return json.loads(data)


async def cache_set(key: str, value: Any, ttl: int = DEFAULT_TTL) -> None:
    """Set a cached value with TTL (seconds)."""
    r = await get_redis()
    serialized = json.dumps(value, default=str)
    await r.set(f"cache:{key}", serialized, ex=ttl)


async def cache_delete(key: str) -> None:
    """Delete a cached key."""
    r = await get_redis()
    await r.delete(f"cache:{key}")


async def cache_get_or_set(key: str, factory: Any, ttl: int = DEFAULT_TTL) -> Any:
    """Get from cache or compute and store if missing. Factory must be async."""
    cached = await cache_get(key)
    if cached is not None:
        return cached
    value: Any = await factory()
    await cache_set(key, value, ttl)
    return value
