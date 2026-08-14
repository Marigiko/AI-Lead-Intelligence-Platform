"""
Instagram Business scraper plugin — discovers businesses via Instagram public profiles.
Many LATAM businesses only have Instagram (no website) — perfect for "needs web" leads.
Uses Instagram's public JSON endpoints (no login required for basic profile data).
"""

from __future__ import annotations

import contextlib
import re
from typing import Any
from urllib.parse import urljoin

import httpx
import structlog

from src.infrastructure.scraping.engine import ScrapeResult
from src.infrastructure.scraping.plugins.base import BaseScraper, ScraperConfig

logger = structlog.get_logger()

# Email regex for extracting from bio
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")


class InstagramScraper(BaseScraper):
    source_name = "instagram"
    source_label = "Instagram Business"
    requires_browser = False  # Uses HTTP API
    default_rpm = 15

    async def scrape(
        self,
        context: None,
        config: ScraperConfig,
    ) -> list[ScrapeResult]:
        """Search for business profiles via Instagram public endpoints."""
        results: list[ScrapeResult] = []

        # Build search terms from keywords
        keywords = config.query.split() if config.query else ["negocio", "tienda", "restaurante"]
        location_terms = config.location.split(",")[0] if config.location else ""

        async with httpx.AsyncClient(
            timeout=10.0,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                    "Version/16.0 Mobile/15E148 Safari/604.1"
                ),
                "Accept": "application/json",
            },
            follow_redirects=True,
        ) as client:
            # Search Instagram's top search API
            search_term = f"{keywords[0]} {location_terms}".strip()
            try:
                response = await client.get(
                    "https://www.instagram.com/web/search/topsearch/",
                    params={"context": "blended", "query": search_term, "count": 20},
                )

                if response.status_code == 200:
                    data = response.json()
                    users = data.get("users", [])

                    for user_entry in users[:config.max_results]:
                        user = user_entry.get("user", {})
                        username = user.get("username", "")
                        full_name = user.get("full_name", "")
                        bio = user.get("byline", "")

                        if not username:
                            continue

                        display_name = full_name or username
                        normalized: dict[str, Any] = {
                            "name": display_name,
                            "instagram_url": f"https://instagram.com/{username}",
                            "industry": "instagram_business",
                        }

                        # Extract email from bio
                        email_match = EMAIL_REGEX.search(bio)
                        if email_match:
                            normalized["email"] = email_match.group(0).lower()

                        # Extract phone from bio
                        phone_match = re.search(r"\+?[\d\s\-\(\)]{8,15}", bio)
                        if phone_match:
                            normalized["phone"] = phone_match.group(0).strip()

                        results.append(ScrapeResult(
                            source="instagram",
                            raw_data=user,
                            normalized_data=normalized,
                            confidence=0.6,
                            source_url=f"https://instagram.com/{username}",
                            source_id=username,
                        ))

            except Exception as e:
                logger.error("instagram_search_error", error=str(e))

        # Also try to get detailed profile info for found accounts
        for result in results[:5]:
            try:
                username = result.source_id
                detail = await self._get_profile_detail(client, username)
                if detail:
                    result.normalized_data.update(detail)
            except Exception:
                pass

        logger.info("instagram_completed", results_count=len(results))
        return results

    async def _get_profile_detail(self, client: httpx.AsyncClient, username: str) -> dict[str, Any] | None:
        """Get detailed profile info from Instagram public page."""
        try:
            response = await client.get(f"https://www.instagram.com/{username}/")
            if response.status_code != 200:
                return None

            # Look for shared data in page source
            text = response.text
            match = re.search(r"window\._sharedData\s*=\s*(\{.+?\});</script>", text, re.DOTALL)
            if match:
                import json
                data = json.loads(match.group(1))
                user_data = data.get("entry_data", {}).get("ProfilePage", [{}])[0].get("graphql", {}).get("user", {})

                details: dict[str, Any] = {}

                if user_data.get("business_email"):
                    details["email"] = user_data["business_email"]
                if user_data.get("business_phone_number"):
                    details["phone"] = user_data["business_phone_number"]
                if user_data.get("business_category_name"):
                    details["industry"] = user_data["business_category_name"]
                if user_data.get("external_url"):
                    details["website"] = user_data["external_url"]
                if user_data.get("biography"):
                    details["description"] = user_data["biography"]

                return details if details else None

        except Exception as e:
            logger.debug("instagram_profile_detail_failed", username=username, error=str(e))

        return None
