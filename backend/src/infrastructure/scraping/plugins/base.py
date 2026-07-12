"""
Abstract base class for all scraper plugins.
Every source plugin must implement this interface.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

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

    def to_dict(self) -> dict[str, Any]:
        """Serialize plugin metadata."""
        return {
            "source_name": self.source_name,
            "source_label": self.source_label,
            "requires_browser": self.requires_browser,
            "requires_api_key": self.requires_api_key,
            "default_rpm": self.default_rpm,
        }
