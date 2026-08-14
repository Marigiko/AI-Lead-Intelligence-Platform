"""
Hunter.io client — email discovery and verification via Hunter.io API.
Uses the hunter_api_key already configured in settings.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import httpx
import structlog

from src.core.config import get_settings

logger = structlog.get_logger()


@dataclass
class HunterEmail:
    email: str
    confidence: int  # 0-100
    type: str  # personal, generic
    verified: bool
    sources: list[str]


@dataclass
class HunterResult:
    domain: str
    emails: list[HunterEmail]
    total_found: int


class HunterClient:
    """Client for Hunter.io API."""

    BASE_URL = "https://api.hunter.io/v2"

    def __init__(self) -> None:
        self._api_key = get_settings().hunter_api_key
        self._enabled = bool(self._api_key)

    @property
    def enabled(self) -> bool:
        return self._enabled

    async def domain_search(self, domain: str) -> Optional[HunterResult]:
        """Search for all email addresses associated with a domain."""
        if not self._enabled:
            return None

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/domain-search",
                    params={"domain": domain, "api_key": self._api_key},
                )

                if response.status_code == 401:
                    logger.warning("hunter_invalid_key")
                    return None

                if response.status_code != 200:
                    logger.warning("hunter_api_error", status=response.status_code)
                    return None

                data = response.json().get("data", {})
                emails = [
                    HunterEmail(
                        email=e.get("value", ""),
                        confidence=e.get("confidence", 0),
                        type=e.get("type", "personal"),
                        verified=e.get("verification", {}).get("status") == "valid",
                        sources=[s.get("uri", "") for s in e.get("sources", [])],
                    )
                    for e in data.get("emails", [])
                ]

                return HunterResult(
                    domain=domain,
                    emails=emails,
                    total_found=len(emails),
                )
        except Exception as e:
            logger.error("hunter_search_failed", domain=domain, error=str(e))
            return None

    async def verify_email(self, email: str) -> Optional[dict]:
        """Verify a single email address deliverability."""
        if not self._enabled:
            return None

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/email-verifier",
                    params={"email": email, "api_key": self._api_key},
                )

                if response.status_code != 200:
                    return None

                data = response.json().get("data", {})
                return {
                    "status": data.get("status"),  # valid, invalid, accept_all, unknown
                    "score": data.get("score", 0),
                    "regexp": data.get("regexp", False),
                    "gibberish": data.get("gibberish", False),
                    "disposable": data.get("disposable", False),
                    "mx_records": data.get("mx_records", False),
                    "smtp_server": data.get("smtp_server", False),
                    "smtp_check": data.get("smtp_check", False),
                }
        except Exception as e:
            logger.error("hunter_verify_failed", email=email, error=str(e))
            return None


async def get_hunter_client() -> HunterClient:
    """Factory function for HunterClient."""
    return HunterClient()
