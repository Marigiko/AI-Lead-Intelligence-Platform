"""
Discovery application use cases.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, cast
from uuid import uuid4

from src.application.discovery import search_store
from src.infrastructure.scraping.intent_parser import get_intent_parser

if TYPE_CHECKING:
    from uuid import UUID

    from celery import Task
    from sqlalchemy.ext.asyncio import AsyncSession

    from src.application.discovery.dto import DiscoverySearchRequest, DiscoverySearchResponse


class DiscoveryUseCases:
    def __init__(self, session: AsyncSession, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id

    async def search(self, request: DiscoverySearchRequest) -> DiscoverySearchResponse:
        """Queue a discovery search and return immediately with its id.

        The pipeline runs inside a Celery worker; clients poll the results
        endpoint until status leaves "running". A 200s+ synchronous HTTP
        request here used to stall browsers and reverse proxies.
        """
        from src.application.discovery.dto import DiscoverySearchResponse
        from src.workers.discovery_tasks import run_discovery_search

        search_id = uuid4()
        pending = DiscoverySearchResponse(
            search_id=search_id,
            status="running",
            started_at=datetime.now(UTC),
        )
        await search_store.save_search(pending)

        cast("Task", run_discovery_search).delay(
            tenant_id=str(self._tenant_id),
            location=request.location,
            intent=request.intent,
            radius_km=request.radius_km,
            max_results=request.max_results,
            sources=request.sources,
            search_id=str(search_id),
        )
        return pending

    async def get_search_results(self, search_id: str) -> DiscoverySearchResponse | None:
        """Retrieve a search by id (Redis-backed, survives process boundaries)."""
        return await search_store.load_search(search_id)

    def parse_intent(self, intent_text: str) -> dict[str, Any]:
        """Parse natural language intent into structured rules (without executing)."""
        parser = get_intent_parser()
        rules = parser.parse(intent_text)
        return {
            "keywords": rules.keywords,
            "industries": rules.industries,
            "signals": rules.signals,
            "sources": rules.sources,
            "has_website": rules.has_website,
        }
