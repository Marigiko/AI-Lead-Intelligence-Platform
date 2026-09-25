"""
Abstract base class for all scraper plugins.
Every source plugin must implement this interface.
"""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

import structlog

logger = structlog.get_logger()

if TYPE_CHECKING:
    from playwright.async_api import BrowserContext

    from src.infrastructure.scraping.engine import ScrapeResult


@dataclass
class ScraperConfig:
    """Configuration passed to a scraper plugin."""

    location: str = ""
    latitude: float | None = None
    longitude: float | None = None
    radius_km: int = 50
    query: str = ""
    max_results: int = 100
    language: str = "es"
    extra_params: dict[str, Any] = field(default_factory=dict)  # pyright: ignore[reportUnknownVariableType]


class BaseScraper(ABC):
    """
    Base class for all scraper plugins.

    To create a new scraper:
    1. Subclass BaseScraper
    2. Set `source_name` class variable
    3. Implement `scrape()` method
    4. The plugin is auto-registered via PluginRegistry
    """

    source_name: str = ""
    source_label: str = ""
    requires_browser: bool = True
    requires_api_key: bool = False
    default_rpm: int = 30  # requests per minute
    _api_key: str | None = None
    _enabled: bool = True

    @abstractmethod
    async def scrape(
        self,
        context: BrowserContext | None,
        config: ScraperConfig,
    ) -> list[ScrapeResult]:
        """
        Execute the scraping logic and return normalized results.

        Args:
            context: Playwright browser context (None if requires_browser=False)
            config: Search configuration

        Returns:
            List of normalized scrape results
        """
        ...

    async def validate_config(self, config: ScraperConfig) -> str | None:  # noqa: ARG002
        """Validate config before scraping. Return error message or None."""
        return None

    async def on_before_scrape(self, config: ScraperConfig) -> None:  # noqa: B027
        """Hook called before scraping starts."""

    async def on_after_scrape(self, results: list[ScrapeResult]) -> None:  # noqa: B027
        """Hook called after scraping completes."""

    async def scrape_with_retry(
        self,
        context: BrowserContext | None,
        config: ScraperConfig,
        max_retries: int = 3,
        base_delay: float = 1.0,
    ) -> list[ScrapeResult]:
        """Scrape with exponential backoff retry."""
        last_error: Exception | None = None
        for attempt in range(max_retries):
            try:
                results = await self.scrape(context, config)
                if results:
                    return results
                if attempt < max_retries - 1:
                    delay = base_delay * (2**attempt)
                    logger.warning(
                        "scrape_retry_empty",
                        source=self.source_name,
                        attempt=attempt + 1,
                        delay=delay,
                    )
                    await asyncio.sleep(delay)
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    delay = base_delay * (2**attempt)
                    logger.warning(
                        "scrape_retry_error",
                        source=self.source_name,
                        attempt=attempt + 1,
                        error=str(e)[:100],
                        delay=delay,
                    )
                    await asyncio.sleep(delay)

        if last_error:
            logger.error(
                "scrape_failed_all_retries",
                source=self.source_name,
                retries=max_retries,
                error=str(last_error)[:100],
            )
        return []

    def configure(
        self, *, api_key: str | None = None, rpm: int | None = None, enabled: bool | None = None
    ) -> None:
        """Update plugin configuration at runtime."""
        if api_key is not None:
            self._api_key = api_key
        if rpm is not None:
            self.default_rpm = rpm
        if enabled is not None:
            self._enabled = enabled

    @property
    def api_key(self) -> str | None:
        return self._api_key

    @property
    def enabled(self) -> bool:
        return self._enabled

    def to_dict(self) -> dict[str, Any]:
        """Serialize plugin metadata."""
        return {
            "source_name": self.source_name,
            "source_label": self.source_label,
            "requires_browser": self.requires_browser,
            "requires_api_key": self.requires_api_key,
            "default_rpm": self.default_rpm,
            "has_api_key": self._api_key is not None,
            "enabled": self._enabled,
        }
