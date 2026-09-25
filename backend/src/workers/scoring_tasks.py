from __future__ import annotations

import asyncio
from typing import Any
from uuid import UUID

import structlog

from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(name="src.workers.scoring_tasks.score_company")  # type: ignore[reportUntypedFunctionDecorator]
def score_company(
    company_id: str, tenant_id: str, search_intent: str | None = None
) -> dict[str, Any]:
    """Calculate opportunity score + AI analysis with justification for a company.

    tenant_id is mandatory — it scopes enrichment to the correct tenant and
    prevents cross-tenant data leakage when multiple workers are running.
    """
    logger.info(
        "scoring_started",
        company_id=company_id,
        tenant_id=tenant_id,
        has_intent=bool(search_intent),
    )

    async def _run():
        from src.application.enrichment.orchestrator import EnrichmentOrchestrator
        from src.core.database import get_session_factory

        factory = get_session_factory()
        async with factory() as session:
            orchestrator = EnrichmentOrchestrator(session, UUID(tenant_id))
            # analyze_and_score runs enrichment + AI analysis
            result = await orchestrator.analyze_and_score(
                UUID(company_id),
                search_intent=search_intent,
            )
            await session.commit()
            return result

    return asyncio.run(_run())


@celery_app.task(name="src.workers.scoring_tasks.score_batch")  # type: ignore[reportUntypedFunctionDecorator]
def score_batch(
    company_ids: list[str], tenant_id: str, search_intent: str | None = None
) -> dict[str, Any]:
    """Score multiple companies. Used after discovery.

    tenant_id is mandatory — all company_ids must belong to this tenant.
    """
    logger.info("batch_scoring_started", count=len(company_ids), tenant_id=tenant_id)

    async def _run():
        from src.application.enrichment.orchestrator import EnrichmentOrchestrator
        from src.core.database import get_session_factory

        factory = get_session_factory()
        tenant_uuid = UUID(tenant_id)
        results = []
        for cid in company_ids:
            try:
                async with factory() as session:
                    orchestrator = EnrichmentOrchestrator(session, tenant_uuid)
                    result = await orchestrator.analyze_and_score(
                        UUID(cid),
                        search_intent=search_intent,
                    )
                    await session.commit()
                    results.append(result)
            except Exception as e:
                logger.error("batch_scoring_error", company_id=cid, error=str(e))
                results.append({"company_id": cid, "error": str(e)})
        return {"scored": len(results), "results": results}

    return asyncio.run(_run())
