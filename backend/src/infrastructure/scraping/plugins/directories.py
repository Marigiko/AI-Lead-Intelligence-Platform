"""
Generic directory scraper — handles multiple business directories.
"""

import contextlib

import structlog
from playwright.async_api import BrowserContext
from playwright.async_api import TimeoutError as PlaywrightTimeout

from src.infrastructure.scraping.engine import ScrapeResult
from src.infrastructure.scraping.plugins.base import BaseScraper, ScraperConfig

logger = structlog.get_logger()


def _clean_text(text: str) -> str:
    """Remove non-printable and weird unicode characters."""
    return "".join(c for c in text if c.isprintable() and ord(c) < 0xE000).strip()


class PaginasAmarillasScraper(BaseScraper):
    """Scrapes PaginasAmarillas.com.ar"""

    source_name = "paginas_amarillas"
    source_label = "Paginas Amarillas"
    requires_browser = True
    default_rpm = 10

    async def scrape(
        self,
        context: BrowserContext | None,
        config: ScraperConfig,
    ) -> list[ScrapeResult]:
        if not context:
            return []

        page = await context.new_page()
        results: list[ScrapeResult] = []

        try:
            query = config.query.replace(" ", "+")
            location = config.location.replace(" ", "+") if config.location else ""
            url = f"https://www.paginasamarillas.com.ar/buscar/{query}/{location}"

            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(3000)

            # Collect listings
            listings = page.locator(".result-card, .aviso-item, article.listing-result")
            count = await listings.count()

            for i in range(min(count, config.max_results)):
                try:
                    listing = listings.nth(i)

                    name = ""
                    with contextlib.suppress(Exception):
                        name_el = listing.locator("h2, .business-name, .aviso-title")
                        if await name_el.count() > 0:
                            name = _clean_text(await name_el.first.inner_text())

                    phone = ""
                    with contextlib.suppress(Exception):
                        phone_el = listing.locator(".phone, .telefono, [data-phone]")
                        if await phone_el.count() > 0:
                            phone = _clean_text(await phone_el.first.inner_text())

                    address = ""
                    with contextlib.suppress(Exception):
                        addr_el = listing.locator(".address, .direccion, .location")
                        if await addr_el.count() > 0:
                            address = _clean_text(await addr_el.first.inner_text())

                    website = ""
                    with contextlib.suppress(Exception):
                        link_el = listing.locator("a[href*='http']")
                        if await link_el.count() > 0:
                            website = await link_el.first.get_attribute("href") or ""

                    if name:
                        results.append(
                            ScrapeResult(
                                source="paginas_amarillas",
                                raw_data={"name": name, "phone": phone, "address": address},
                                normalized_data={
                                    "name": name,
                                    "phone": phone,
                                    "address": address,
                                    "website": website,
                                },
                                confidence=0.7,
                                source_url=url,
                            )
                        )
                except Exception as e:
                    logger.debug("pa_listing_parse_failed", index=i, error=str(e))

        except PlaywrightTimeout:
            logger.warning("pa_timeout")
        except Exception as e:
            logger.error("pa_error", error=str(e))
        finally:
            await page.close()

        return results


class BingPlacesScraper(BaseScraper):
    """Scrapes Bing Places for Business."""

    source_name = "bing_places"
    source_label = "Bing Places"
    requires_browser = True
    default_rpm = 15

    async def scrape(
        self,
        context: BrowserContext | None,
        config: ScraperConfig,
    ) -> list[ScrapeResult]:
        if not context:
            return []

        page = await context.new_page()
        results: list[ScrapeResult] = []

        try:
            query = f"{config.query} {config.location}".strip()
            url = f"https://www.bing.com/maps?q={query.replace(' ', '+')}&FORM=HDRSC6"

            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(3000)

            # Collect sidebar listings
            listings = page.locator(".b_entityTP, .b_ans")
            count = await listings.count()

            for i in range(min(count, config.max_results)):
                with contextlib.suppress(Exception):
                    listing = listings.nth(i)
                    name = ""
                    with contextlib.suppress(Exception):
                        name_el = listing.locator("h2, .b_entityTitle")
                        if await name_el.count() > 0:
                            name = _clean_text(await name_el.first.inner_text())

                    if name:
                        results.append(
                            ScrapeResult(
                                source="bing_places",
                                raw_data={"name": name},
                                normalized_data={"name": name},
                                confidence=0.6,
                                source_url=url,
                            )
                        )

        except PlaywrightTimeout:
            logger.warning("bing_timeout")
        except Exception as e:
            logger.error("bing_error", error=str(e))
        finally:
            await page.close()

        return results
