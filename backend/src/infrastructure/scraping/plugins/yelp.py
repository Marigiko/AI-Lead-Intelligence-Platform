"""
Yelp scraper plugin — discovers businesses via Yelp search.
Good source for restaurants, local services, and retail businesses.
"""

from __future__ import annotations

import contextlib
import re
from typing import Any

import structlog
from playwright.async_api import BrowserContext, Page
from playwright.async_api import TimeoutError as PlaywrightTimeout

from src.infrastructure.scraping.engine import ScrapeResult
from src.infrastructure.scraping.plugins.base import BaseScraper, ScraperConfig

logger = structlog.get_logger()


class YelpScraper(BaseScraper):
    source_name = "yelp"
    source_label = "Yelp"
    requires_browser = True
    default_rpm = 10  # Conservative to avoid blocks

    async def scrape(
        self,
        context: BrowserContext | None,
        config: ScraperConfig,
    ) -> list[ScrapeResult]:
        if not context:
            logger.error("yelp_no_context")
            return []

        page = await context.new_page()
        results: list[ScrapeResult] = []

        try:
            search_query = self._build_search_query(config)
            logger.info("yelp_search", query=search_query)

            # Navigate to Yelp search
            location_encoded = config.location.replace(" ", "+") if config.location else ""
            query_encoded = config.query.replace(" ", "+") if config.query else ""
            url = f"https://www.yelp.com/search?find_desc={query_encoded}&find_loc={location_encoded}"

            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(3000)

            # Collect results
            results = await self._collect_results(page, config.max_results)

        except PlaywrightTimeout:
            logger.warning("yelp_timeout")
        except Exception as e:
            logger.error("yelp_error", error=str(e))
        finally:
            await page.close()

        logger.info("yelp_completed", results_count=len(results))
        return results

    def _build_search_query(self, config: ScraperConfig) -> str:
        parts = [config.query]
        if config.location:
            parts.append(config.location)
        return " ".join(parts)

    async def _collect_results(self, page: Page, max_results: int) -> list[ScrapeResult]:
        results: list[ScrapeResult] = []
        seen_names: set[str] = set()

        # Wait for results to load
        try:
            await page.wait_for_selector('[data-testid="serp-ia-card"], .container__09f24__1j2su', timeout=10000)
        except PlaywrightTimeout:
            logger.warning("yelp_no_results")
            return results

        # Scroll to load more results
        for _ in range(10):
            if len(results) >= max_results:
                break

            # Get business cards
            items = page.locator('[data-testid="serp-ia-card"] a.css-1m051bw, .container__09f24__1j2su h3 a')
            count = await items.count()

            for i in range(count):
                if len(results) >= max_results:
                    break

                with contextlib.suppress(Exception):
                    item = items.nth(i)
                    name = (await item.inner_text()).strip()

                    if not name or name in seen_names:
                        continue
                    seen_names.add(name)

                    result = ScrapeResult(
                        source="yelp",
                        raw_data={"name": name},
                        normalized_data={"name": name},
                        confidence=0.85,
                        source_url=page.url,
                        source_id=name,
                    )
                    results.append(result)

            # Scroll down
            await page.evaluate("window.scrollBy(0, 800)")
            await page.wait_for_timeout(2000)

        # Get details for each result
        for i, result in enumerate(results[:min(5, len(results))]):
            try:
                detail = await self._get_business_details(page, result.normalized_data["name"])
                if detail:
                    result.normalized_data.update(detail)
            except Exception as e:
                logger.debug("yelp_detail_failed", index=i, error=str(e))

        return results

    async def _get_business_details(self, page: Page, business_name: str) -> dict[str, Any] | None:
        """Search for a specific business and extract details."""
        details: dict[str, Any] = {}

        try:
            # Extract phone from search results page
            phone_el = page.locator(f'[class*="phone"]').first
            if await phone_el.count() > 0:
                details["phone"] = (await phone_el.inner_text()).strip()

            # Extract address
            addr_el = page.locator(f'[class*="address"]').first
            if await addr_el.count() > 0:
                details["address"] = (await addr_el.inner_text()).strip()

            # Extract website (Yelp often links to business websites)
            website_links = page.locator('a[href*="biz_redir"]')
            if await website_links.count() > 0:
                href = await website_links.first.get_attribute("href") or ""
                # Parse URL from Yelp redirect
                match = re.search(r"url=([^&]+)", href)
                if match:
                    from urllib.parse import unquote
                    details["website"] = unquote(match.group(1))

            # Extract categories
            cats = page.locator('a[class*="css-*"][href*="/c/"]')
            categories: list[str] = []
            for j in range(min(await cats.count(), 5)):
                cat_text = await cats.nth(j).inner_text()
                if cat_text.strip():
                    categories.append(cat_text.strip())
            if categories:
                details["categories"] = categories

        except Exception as e:
            logger.debug("yelp_detail_extract_failed", error=str(e))

        return details if details else None
