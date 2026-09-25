"""
Facebook Business scraper plugin — discovers businesses via Facebook search.
Many businesses have Facebook pages but no website — perfect for "needs web" leads.
"""

from __future__ import annotations

import contextlib

import structlog
from playwright.async_api import BrowserContext, Page
from playwright.async_api import TimeoutError as PlaywrightTimeout

from src.infrastructure.scraping.engine import ScrapeResult
from src.infrastructure.scraping.plugins.base import BaseScraper, ScraperConfig

logger = structlog.get_logger()


class FacebookScraper(BaseScraper):
    source_name = "facebook"
    source_label = "Facebook Business"
    requires_browser = True
    default_rpm = 8  # Very conservative — Facebook is aggressive with blocks

    async def scrape(
        self,
        context: BrowserContext | None,
        config: ScraperConfig,
    ) -> list[ScrapeResult]:
        if not context:
            logger.error("facebook_no_context")
            return []

        page = await context.new_page()
        results: list[ScrapeResult] = []

        try:
            search_query = self._build_search_query(config)
            logger.info("facebook_search", query=search_query)

            # Navigate to Facebook public search (no login required for basic results)
            query_encoded = search_query.replace(" ", "+")
            url = f"https://www.facebook.com/public?q={query_encoded}"

            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(3000)

            # Try pages search instead (more relevant for businesses)
            pages_url = f"https://www.facebook.com/search/pages/?q={query_encoded}"
            await page.goto(pages_url, wait_until="domcontentloaded")
            await page.wait_for_timeout(3000)

            results = await self._collect_results(page, config.max_results)

        except PlaywrightTimeout:
            logger.warning("facebook_timeout")
        except Exception as e:
            logger.error("facebook_error", error=str(e))
        finally:
            await page.close()

        logger.info("facebook_completed", results_count=len(results))
        return results

    def _build_search_query(self, config: ScraperConfig) -> str:
        parts = [config.query]
        if config.location:
            parts.append(config.location)
        return " ".join(parts)

    async def _collect_results(self, page: Page, max_results: int) -> list[ScrapeResult]:
        results: list[ScrapeResult] = []
        seen_names: set[str] = set()

        # Facebook search results selectors
        try:
            await page.wait_for_selector(
                '[role="article"], [data-pagelet="SearchResults"]', timeout=8000
            )
        except PlaywrightTimeout:
            logger.warning("facebook_no_results")
            return results

        # Scroll and collect
        for _ in range(8):
            if len(results) >= max_results:
                break

            # Page result items
            items = page.locator('[role="article"] [role="link"], [data-pagelet] a[role="link"]')
            count = await items.count()

            for i in range(count):
                if len(results) >= max_results:
                    break

                with contextlib.suppress(Exception):
                    item = items.nth(i)
                    name = (await item.inner_text()).strip()

                    if not name or len(name) < 3 or name in seen_names:
                        continue
                    seen_names.add(name)

                    href = await item.get_attribute("href") or ""

                    result = ScrapeResult(
                        source="facebook",
                        raw_data={"name": name, "href": href},
                        normalized_data={
                            "name": name,
                            "facebook_url": href,
                            "industry": "facebook_business",
                        },
                        confidence=0.7,
                        source_url=href,
                        source_id=name,
                    )
                    results.append(result)

            # Scroll down
            await page.evaluate("window.scrollBy(0, 800)")
            await page.wait_for_timeout(2000)

        return results
