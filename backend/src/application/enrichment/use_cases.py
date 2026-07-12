"""
Enrichment application use cases.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from src.application.enrichment.orchestrator import EnrichmentOrchestrator

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


class EnrichmentUseCases:
    def __init__(self, session: AsyncSession, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id

    async def enrich_company(self, company_id: UUID) -> dict[str, Any]:
        """Enrich a single company."""
        orchestrator = EnrichmentOrchestrator(self._session, self._tenant_id)
        return await orchestrator.enrich_company(company_id)

    async def analyze_and_score(self, company_id: UUID) -> dict[str, Any]:
        """Enrich + AI analyze + score a company."""
        orchestrator = EnrichmentOrchestrator(self._session, self._tenant_id)
        return await orchestrator.analyze_and_score(company_id)

    async def batch_enrich(self, company_ids: list[UUID]) -> list[dict[str, Any]]:
        """Enrich multiple companies."""
        orchestrator = EnrichmentOrchestrator(self._session, self._tenant_id)
        return await orchestrator.batch_enrich(company_ids)
