"""
Discovery application use cases.
"""
from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.discovery.dto import DiscoverySearchRequest, DiscoverySearchResponse
from src.application.discovery.orchestrator import DiscoveryOrchestrator
from src.infrastructure.scraping.intent_parser import get_intent_parser


class DiscoveryUseCases:
    def __init__(self, session: AsyncSession, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id

    async def search(self, request: DiscoverySearchRequest) -> DiscoverySearchResponse:
        """Execute a discovery search."""
        orchestrator = DiscoveryOrchestrator(self._session, self._tenant_id)
        return await orchestrator.execute(request)

    def parse_intent(self, intent_text: str) -> dict:
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
