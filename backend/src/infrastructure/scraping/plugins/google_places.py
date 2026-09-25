"""
Google Places API plugin — discovers businesses via Google Places API.
More stable than scraping Google Maps directly. Requires a Google API key.
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

import httpx
import structlog

from src.core.config import get_settings
from src.infrastructure.scraping.engine import ScrapeResult
from src.infrastructure.scraping.plugins.base import BaseScraper, ScraperConfig

if TYPE_CHECKING:
    from playwright.async_api import BrowserContext

logger = structlog.get_logger()


class GooglePlacesScraper(BaseScraper):
    source_name = "google_places"
    source_label = "Google Places API"
    requires_browser = False
    requires_api_key = True
    default_rpm = 60

    def __init__(self) -> None:
        self._api_key = getattr(get_settings(), "google_places_api_key", "")

    async def validate_config(self, config: ScraperConfig) -> str | None:  # noqa: ARG002
        if not self._api_key:
            return "Google Places API key not configured"
        return None

    async def scrape(
        self,
        context: BrowserContext | None,  # noqa: ARG002
        config: ScraperConfig,
    ) -> list[ScrapeResult]:
        if not self._api_key:
            return []

        results: list[ScrapeResult] = []

        async with httpx.AsyncClient(timeout=15.0) as client:
            # Step 1: Geocode location to get lat/lng
            lat, lng = config.latitude, config.longitude
            if lat is None or lng is None:
                lat, lng = await self._geocode_location(client, config.location)
                if lat is None or lng is None:
                    return []

            # Step 2: Search nearby places
            try:
                search_results = await self._search_nearby(client, lat, lng, config)
                for place in search_results[: config.max_results]:
                    place_id = place.get("place_id", "")
                    detail = await self._get_place_detail(client, place_id)

                    normalized: dict[str, Any] = {
                        "name": place.get("name", ""),
                        "address": place.get("vicinity", ""),
                        "google_place_id": place_id,
                        "latitude": place.get("geometry", {}).get("location", {}).get("lat"),
                        "longitude": place.get("geometry", {}).get("location", {}).get("lng"),
                    }

                    if detail:
                        if detail.get("formatted_phone_number"):
                            normalized["phone"] = detail["formatted_phone_number"]
                        if detail.get("website"):
                            normalized["website"] = detail["website"]
                            normalized["domain"] = (
                                detail["website"]
                                .replace("https://", "")
                                .replace("http://", "")
                                .split("/")[0]
                            )
                        if detail.get("rating"):
                            normalized["google_rating"] = detail["rating"]
                        if detail.get("user_ratings_total"):
                            normalized["google_review_count"] = detail["user_ratings_total"]

                    results.append(
                        ScrapeResult(
                            source="google_places",
                            raw_data=place,
                            normalized_data=normalized,
                            confidence=0.95,
                            source_url=detail.get("url", "") if detail else "",
                            source_id=place_id,
                        )
                    )

            except Exception as e:
                logger.error("google_places_error", error=str(e))

        logger.info("google_places_completed", results_count=len(results))
        return results

    async def _geocode_location(
        self, client: httpx.AsyncClient, location: str
    ) -> tuple[float | None, float | None]:
        """Geocode a location string to lat/lng."""
        try:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": location, "key": self._api_key},
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("results"):
                    loc = data["results"][0]["geometry"]["location"]
                    return loc["lat"], loc["lng"]
        except Exception as e:
            logger.error("google_places_geocode_error", error=str(e))
        return None, None

    async def _search_nearby(
        self, client: httpx.AsyncClient, lat: float, lng: float, config: ScraperConfig
    ) -> list[dict[str, Any]]:
        """Search for places near a location."""
        all_results: list[dict[str, Any]] = []

        params: dict[str, str] = {
            "location": f"{lat},{lng}",
            "radius": str(config.radius_km * 1000),
            "key": self._api_key or "",
        }
        if config.query:
            params["keyword"] = config.query

        response = await client.get(
            "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
            params=params,
        )

        if response.status_code == 200:
            data = response.json()
            all_results.extend(data.get("results", []))

            # Handle pagination
            next_page_token = data.get("next_page_token")
            if next_page_token and len(all_results) < config.max_results:
                # Small delay for token to be valid
                await asyncio.sleep(2)

                params2 = {"pagetoken": next_page_token, "key": self._api_key}
                response2 = await client.get(
                    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                    params=params2,
                )
                if response2.status_code == 200:
                    all_results.extend(response2.json().get("results", []))

        return all_results

    async def _get_place_detail(
        self, client: httpx.AsyncClient, place_id: str
    ) -> dict[str, Any] | None:
        """Get detailed information for a place."""
        try:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/place/details/json",
                params={
                    "place_id": place_id,
                    "fields": (
                        "name,formatted_phone_number,website,rating,"
                        "user_ratings_total,url,formatted_address"
                    ),
                    "key": self._api_key,
                },
            )
            if response.status_code == 200:
                return response.json().get("result", {})
        except Exception as e:
            logger.debug("google_places_detail_failed", place_id=place_id, error=str(e))
        return None
