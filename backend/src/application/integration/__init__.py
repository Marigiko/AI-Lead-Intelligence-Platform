"""
CRM/third-party integration connectors (HubSpot, Pipedrive, etc.).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import structlog

logger = structlog.get_logger()


class CRMConnector(ABC):
    """Abstract base for CRM platform connectors."""

    @abstractmethod
    async def push_companies(self, companies: list[dict[str, Any]]) -> int:
        """Push companies to external CRM. Returns count synced."""
        ...

    @abstractmethod
    async def push_deals(self, deals: list[dict[str, Any]]) -> int:
        """Push deals to external CRM. Returns count synced."""
        ...

    @abstractmethod
    async def pull_companies(self, since: str | None = None) -> list[dict[str, Any]]:
        """Pull companies from external CRM."""
        ...


class HubSpotConnector(CRMConnector):
    """HubSpot CRM integration."""

    def __init__(self, access_token: str) -> None:
        self._token = access_token
        self._base_url = "https://api.hubapi.com/crm/v3"

    async def push_companies(self, companies: list[dict[str, Any]]) -> int:
        logger.info("hubspot_push_companies", count=len(companies))
        return 0

    async def push_deals(self, deals: list[dict[str, Any]]) -> int:
        logger.info("hubspot_push_deals", count=len(deals))
        return 0

    async def pull_companies(self, since: str | None = None) -> list[dict[str, Any]]:
        logger.info("hubspot_pull_companies", since=since)
        return []


class PipedriveConnector(CRMConnector):
    """Pipedrive CRM integration."""

    def __init__(self, api_token: str, company_domain: str) -> None:
        self._token = api_token
        self._base_url = f"https://{company_domain}.pipedrive.com/api/v1"

    async def push_companies(self, companies: list[dict[str, Any]]) -> int:
        logger.info("pipedrive_push_companies", count=len(companies))
        return 0

    async def push_deals(self, deals: list[dict[str, Any]]) -> int:
        logger.info("pipedrive_push_deals", count=len(deals))
        return 0

    async def pull_companies(self, since: str | None = None) -> list[dict[str, Any]]:
        logger.info("pipedrive_pull_companies", since=since)
        return []
