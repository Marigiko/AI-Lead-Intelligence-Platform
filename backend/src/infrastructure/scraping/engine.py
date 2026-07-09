"""
Scraping engine core — manages browser pool, job execution, and lifecycle.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

import structlog
from playwright.async_api import Browser, BrowserContext, Playwright, async_playwright

from src.core.config import get_settings

logger = structlog.get_logger()


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class ScrapeJob:
    id: UUID = field(default_factory=uuid4)
    tenant_id: UUID | None = None
    source: str = ""
    search_params: dict[str, Any] = field(default_factory=dict)
    status: JobStatus = JobStatus.PENDING
    results_count: int = 0
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ScrapeResult:
    source: str
    raw_data: dict[str, Any]
    normalized_data: dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0
    source_url: str = ""
    source_id: str = ""


class BrowserPool:
    """Manages a pool of Playwright browser contexts for concurrent scraping."""

    def __init__(self, max_contexts: int = 5) -> None:
        self._max_contexts = max_contexts
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._contexts: list[BrowserContext] = []
        self._available: asyncio.Semaphore = asyncio.Semaphore(max_contexts)
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        if self._browser:
            return
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-infobars",
                "--window-size=1920,1080",
            ],
        )
        logger.info("browser_pool_started", max_contexts=self._max_contexts)

    async def stop(self) -> None:
        async with self._lock:
            for ctx in self._contexts:
                try:
                    await ctx.close()
                except Exception:
                    pass
            self._contexts.clear()

            if self._browser:
                await self._browser.close()
                self._browser = None
            if self._playwright:
                await self._playwright.stop()
                self._playwright = None
        logger.info("browser_pool_stopped")

    async def acquire(self) -> BrowserContext:
        await self._available.acquire()
        async with self._lock:
            if not self._browser:
                await self.start()
            assert self._browser is not None
            context = await self._create_context()
            self._contexts.append(context)
            return context

    async def release(self, context: BrowserContext) -> None:
        async with self._lock:
            if context in self._contexts:
                self._contexts.remove(context)
        try:
            await context.close()
        except Exception:
            pass
        self._available.release()

    async def _create_context(self) -> BrowserContext:
        assert self._browser is not None
        return await self._browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            locale="es-AR",
            timezone_id="America/Argentina/Buenos_Aires",
            java_script_enabled=True,
            bypass_csp=True,
        )

    @property
    def active_count(self) -> int:
        return len(self._contexts)


# Singleton
_pool: BrowserPool | None = None


def get_browser_pool() -> BrowserPool:
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = BrowserPool(max_contexts=settings.scraping_max_concurrent)
    return _pool
