"""
Google Maps scraper plugin — discovers businesses via Google Maps.
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


class GoogleMapsScraper(BaseScraper):
    source_name = "google_maps"
    source_label = "Google Maps"
    requires_browser = True
    default_rpm = 15  # Conservative to avoid blocks

    async def scrape(
        self,
        context: BrowserContext | None,
        config: ScraperConfig,
    ) -> list[ScrapeResult]:
        if not context:
            logger.error("google_maps_no_context")
            return []

        page = await context.new_page()
        results: list[ScrapeResult] = []

        try:
            search_query = self._build_search_query(config)
            logger.info("google_maps_search", query=search_query)

            # Navigate to Google Maps
            await page.goto("https://www.google.com/maps", wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)

            # Accept cookies if prompted
            with contextlib.suppress(Exception):
                cookie_btn = page.locator('button:has-text("Aceptar"), button:has-text("Accept")')
                if await cookie_btn.count() > 0:
                    await cookie_btn.first.click()
                    await page.wait_for_timeout(1000)

            # Type search query (try multiple selectors for Google Maps updates)
            search_box = page.locator('input[name="q"], input[name="search"], #searchboxinput')
            try:
                await search_box.wait_for(state='visible', timeout=10000)
            except Exception:
                logger.warning("google_maps_search_box_not_found")
                return results
            await search_box.fill(search_query)
            await search_box.press("Enter")
            await page.wait_for_timeout(3000)

            # Scroll and collect results
            results = await self._collect_results(page, config.max_results)

        except PlaywrightTimeout:
            logger.warning("google_maps_timeout")
        except Exception as e:
            logger.error("google_maps_error", error=str(e))
        finally:
            await page.close()

        logger.info("google_maps_completed", results_count=len(results))
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
            await page.wait_for_selector('[role="feed"], .Nv2PK', timeout=10000)
        except PlaywrightTimeout:
            logger.warning("google_maps_no_results_feed")
            return results

        scroll_container = page.locator('[role="feed"]').first

        for _ in range(20):  # Max 20 scroll iterations
            if len(results) >= max_results:
                break

            # Get current result items
            items = page.locator('.Nv2PK a[href*="/maps/place/"]')
            count = await items.count()

            for i in range(count):
                if len(results) >= max_results:
                    break

                with contextlib.suppress(Exception):
                    item = items.nth(i)
                    name = await item.get_attribute("aria-label") or ""
                    name = name.strip()

                    if not name or name in seen_names:
                        continue
                    seen_names.add(name)

                    href = await item.get_attribute("href") or ""
                    place_id = self._extract_place_id(href)
                    coords = self._extract_coordinates_from_url(href)

                    result = ScrapeResult(
                        source="google_maps",
                        raw_data={"name": name, "href": href, "place_id": place_id},
                        normalized_data={
                            "name": name,
                            "google_maps_url": href,
                            "google_place_id": place_id,
                            "latitude": coords[0] if coords else None,
                            "longitude": coords[1] if coords else None,
                        },
                        confidence=0.9,
                        source_url=href,
                        source_id=place_id,
                    )
                    results.append(result)

            # Scroll down
            try:
                await scroll_container.evaluate("el => el.scrollTop += el.scrollHeight")
                await page.wait_for_timeout(2000)
            except Exception:
                break

            # Check if we've reached the end
            end_indicator = page.locator(".HlvSq")
            if await end_indicator.count() > 0:
                break

        # Click into each result to get detailed info
        for i, result in enumerate(results[:max_results]):
            try:
                detail = await self._get_place_details(page, result.source_url)
                if detail:
                    result.normalized_data.update(detail)
            except Exception as e:
                logger.debug("place_detail_failed", index=i, error=str(e))

        return results

    @staticmethod
    def _clean_text(text: str) -> str:
        """Remove non-printable and weird unicode characters."""
        return "".join(c for c in text if c.isprintable() and ord(c) < 0xE000).strip()

    async def _get_place_details(self, page: Page, url: str) -> dict[str, Any] | None:
        """Navigate to a place page and extract detailed information."""
        if not url:
            return None

        await page.goto(url, wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        details: dict[str, Any] = {}

        # Extract coordinates from URL
        coords = self._extract_coordinates_from_url(url)
        if coords:
            details["latitude"] = coords[0]
            details["longitude"] = coords[1]

        # Extract address
        with contextlib.suppress(Exception):
            addr = page.locator('button[data-item-id="address"] .Io6YTe, [data-item-id="address"]')
            if await addr.count() > 0:
                details["address"] = self._clean_text(await addr.first.inner_text())

        # Extract phone
        with contextlib.suppress(Exception):
            phone = page.locator('button[data-item-id*="phone"] .Io6YTe, [data-item-id*="phone"]')
            if await phone.count() > 0:
                details["phone"] = self._clean_text(await phone.first.inner_text())

        # Extract website
        with contextlib.suppress(Exception):
            website = page.locator(
                'a[data-item-id="authority"] .Io6YTe, [data-item-id="authority"]'
            )
            if await website.count() > 0:
                details["website"] = self._clean_text(await website.first.inner_text())

        # Extract rating
        with contextlib.suppress(Exception):
            rating = page.locator('.MW4etd, span[role="img"][aria-label*="estrellas"]')
            if await rating.count() > 0:
                rating_text = await rating.first.inner_text()
                match = re.search(r"([\d.]+)", rating_text)
                if match:
                    details["google_rating"] = float(match.group(1))

        # Extract review count
        with contextlib.suppress(Exception):
            reviews = page.locator('.UY7F9, span[aria-label*="reseñas"]')
            if await reviews.count() > 0:
                review_text = await reviews.first.inner_text()
                match = re.search(r"([\d.]+)", review_text.replace(".", ""))
                if match:
                    details["google_review_count"] = int(match.group(1))

        # Extract categories
        with contextlib.suppress(Exception):
            cats = page.locator('.DkEaL, button[jsaction*="category"]')
            if await cats.count() > 0:
                categories: list[str] = []
                for j in range(await cats.count()):
                    cat_text = await cats.nth(j).inner_text()
                    if cat_text.strip():
                        categories.append(cat_text.strip())
                if categories:
                    details["google_categories"] = categories

        # Extract hours
        with contextlib.suppress(Exception):
            hours_btn = page.locator('button[data-item-id*="hours"]')
            if await hours_btn.count() > 0:
                await hours_btn.first.click()
                await page.wait_for_timeout(1000)
                hours_rows = page.locator(".y0RxZc table tr")
                hours = {}
                for j in range(await hours_rows.count()):
                    row = hours_rows.nth(j)
                    cells = row.locator("td")
                    if await cells.count() >= 2:
                        day = (await cells.nth(0).inner_text()).strip()
                        time_range = (await cells.nth(1).inner_text()).strip()
                        hours[day] = time_range
                if hours:
                    details["business_hours"] = hours

        return details if details else None

    def _extract_place_id(self, url: str) -> str:
        match = re.search(r"place/([^/]+)", url)
        return match.group(1) if match else ""

    @staticmethod
    def _extract_coordinates_from_url(url: str) -> tuple[float, float] | None:
        """Extract lat/lng from Google Maps URL patterns."""
        match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", url)
        if match:
            return float(match.group(1)), float(match.group(2))
        match = re.search(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)", url)
        if match:
            return float(match.group(1)), float(match.group(2))
        return None
