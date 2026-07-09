"""
Geocoding service — converts locations to coordinates.
Uses Nominatim (OpenStreetMap) as primary, with fallback.
"""
from __future__ import annotations

from dataclasses import dataclass

import httpx
import structlog

logger = structlog.get_logger()


@dataclass
class GeocodeResult:
    latitude: float
    longitude: float
    display_name: str
    country: str = ""
    state: str = ""
    city: str = ""
    postcode: str = ""


class GeocodingService:
    """Converts addresses/location names to coordinates."""

    NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

    async def geocode(self, query: str) -> GeocodeResult | None:
        """Geocode a location string to coordinates."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    self.NOMINATIM_URL,
                    params={
                        "q": query,
                        "format": "json",
                        "limit": 1,
                        "addressdetails": 1,
                    },
                    headers={"User-Agent": "AILeadPlatform/0.1"},
                )
                resp.raise_for_status()
                results = resp.json()

            if not results:
                logger.warning("geocode_no_results", query=query)
                return None

            r = results[0]
            addr = r.get("address", {})

            return GeocodeResult(
                latitude=float(r["lat"]),
                longitude=float(r["lon"]),
                display_name=r.get("display_name", query),
                country=addr.get("country", ""),
                state=addr.get("state", addr.get("state_district", "")),
                city=addr.get("city", addr.get("town", addr.get("village", ""))),
                postcode=addr.get("postcode", ""),
            )
        except Exception as e:
            logger.error("geocode_error", query=query, error=str(e))
            return None

    async def reverse_geocode(self, lat: float, lon: float) -> GeocodeResult | None:
        """Reverse geocode coordinates to address."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://nominatim.openstreetmap.org/reverse",
                    params={
                        "lat": lat,
                        "lon": lon,
                        "format": "json",
                        "addressdetails": 1,
                    },
                    headers={"User-Agent": "AILeadPlatform/0.1"},
                )
                resp.raise_for_status()
                r = resp.json()

            addr = r.get("address", {})
            return GeocodeResult(
                latitude=lat,
                longitude=lon,
                display_name=r.get("display_name", ""),
                country=addr.get("country", ""),
                state=addr.get("state", ""),
                city=addr.get("city", addr.get("town", "")),
                postcode=addr.get("postcode", ""),
            )
        except Exception as e:
            logger.error("reverse_geocode_error", error=str(e))
            return None


# Singleton
_service: GeocodingService | None = None


def get_geocoding_service() -> GeocodingService:
    global _service
    if _service is None:
        _service = GeocodingService()
    return _service
