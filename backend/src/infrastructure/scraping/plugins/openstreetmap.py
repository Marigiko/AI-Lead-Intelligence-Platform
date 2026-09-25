"""
OpenStreetMap scraper — uses Overpass API for business discovery.
"""

from typing import Any

import httpx
import structlog

from src.infrastructure.scraping.engine import ScrapeResult
from src.infrastructure.scraping.plugins.base import BaseScraper, ScraperConfig

logger = structlog.get_logger()


class OpenStreetMapScraper(BaseScraper):
    """Discovers businesses via Overpass API (OpenStreetMap)."""

    source_name = "openstreetmap"
    source_label = "OpenStreetMap"
    requires_browser = False
    default_rpm = 20

    OVERPASS_URLS = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.openstreetmap.ru/api/interpreter",
    ]

    async def scrape(
        self,
        context: Any,  # noqa: ARG002
        config: ScraperConfig,
    ) -> list[ScrapeResult]:
        results: list[ScrapeResult] = []

        if config.latitude is None or config.longitude is None:
            logger.warning("osm_no_coordinates")
            return results

        try:
            # Build Overpass query for businesses in radius - broader search
            radius_m = config.radius_km * 1000
            query = f"""
            [out:json][timeout:60];
            (
              node["name"]["amenity"](around:{radius_m},{config.latitude},{config.longitude});
              node["name"]["shop"](around:{radius_m},{config.latitude},{config.longitude});
              node["name"]["office"](around:{radius_m},{config.latitude},{config.longitude});
              node["name"]["craft"](around:{radius_m},{config.latitude},{config.longitude});
              node["name"]["amenity"="restaurant"](around:{radius_m},{config.latitude},{config.longitude});
              node["name"]["amenity"="cafe"](around:{radius_m},{config.latitude},{config.longitude});
              node["name"]["amenity"="fast_food"](around:{radius_m},{config.latitude},{config.longitude});
              node["name"]["shop"="supermarket"](around:{radius_m},{config.latitude},{config.longitude});
              node["name"]["shop"="convenience"](around:{radius_m},{config.latitude},{config.longitude});
              node["name"]["amenity"="pharmacy"](around:{radius_m},{config.latitude},{config.longitude});
              node["name"]["amenity"="bank"](around:{radius_m},{config.latitude},{config.longitude});
              node["name"]["office"="company"](around:{radius_m},{config.latitude},{config.longitude});
              way["name"]["amenity"](around:{radius_m},{config.latitude},{config.longitude});
              way["name"]["shop"](around:{radius_m},{config.latitude},{config.longitude});
              way["name"]["office"](around:{radius_m},{config.latitude},{config.longitude});
            );
            out body;
            """

            data = None
            for overpass_url in self.OVERPASS_URLS:
                try:
                    async with httpx.AsyncClient(timeout=30) as client:
                        resp = await client.post(
                            overpass_url,
                            data={"data": query},
                            headers={
                                "Accept": "application/json",
                                "User-Agent": "AILeadPlatform/0.1 (contact@aileadplatform.com)",
                            },
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            break
                        logger.warning(
                            "osm_endpoint_failed", url=overpass_url, status=resp.status_code
                        )
                except Exception as e:
                    # repr() instead of str(): httpx timeouts render as an
                    # empty string, which made this log line useless.
                    logger.warning("osm_endpoint_error", url=overpass_url, error=repr(e))
                    continue

            if data is None:
                logger.error("osm_all_endpoints_failed")
                return results

            elements = data.get("elements", [])
            logger.info("osm_results", count=len(elements))

            elements = data.get("elements", [])
            logger.info("osm_results", count=len(elements))

            for element in elements[: config.max_results]:
                tags = element.get("tags", {})
                name = tags.get("name", "")
                if not name:
                    continue

                result = ScrapeResult(
                    source="openstreetmap",
                    raw_data=element,
                    normalized_data={
                        "name": name,
                        "latitude": element.get("lat"),
                        "longitude": element.get("lon"),
                        "industry": tags.get("amenity", tags.get("shop", tags.get("office", ""))),
                        "phone": tags.get("phone", tags.get("contact:phone", "")),
                        "email": tags.get("email", tags.get("contact:email", "")),
                        "website": tags.get("website", tags.get("contact:website", "")),
                        "address": self._build_address(tags),
                        "opening_hours": tags.get("opening_hours", ""),
                    },
                    confidence=0.8,
                    source_id=str(element.get("id", "")),
                )
                results.append(result)

        except Exception as e:
            logger.error("osm_error", error=str(e))

        return results

    def _build_address(self, tags: dict[str, Any]) -> str:
        parts: list[str] = []
        if "addr:street" in tags:
            street = tags["addr:street"]
            if "addr:housenumber" in tags:
                street += f" {tags['addr:housenumber']}"
            parts.append(street)
        if "addr:city" in tags:
            parts.append(tags["addr:city"])
        if "addr:state" in tags:
            parts.append(tags["addr:state"])
        return ", ".join(parts)
