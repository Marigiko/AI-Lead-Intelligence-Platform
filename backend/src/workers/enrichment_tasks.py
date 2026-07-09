from __future__ import annotations

import asyncio

import structlog
from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(name="src.workers.enrichment_tasks.enrich_company")
def enrich_company(company_id: str) -> dict:
    """Enrich a company with tech stack, SEO, contacts, etc."""
    logger.info("enrichment_started", company_id=company_id)

    async def _run():
        from uuid import UUID
        from src.core.database import get_session_factory
        from src.application.enrichment.orchestrator import EnrichmentOrchestrator
        from src.domain.user.models import User

        factory = get_session_factory()
        async with factory() as session:
            # Get tenant_id from company
            from src.infrastructure.database.repositories.company_repo import SQLAlchemyCompanyRepository
            company_repo = SQLAlchemyCompanyRepository(session)
            company = await company_repo.get_by_id(UUID(company_id))
            if not company:
                return {"error": "Company not found"}

            orchestrator = EnrichmentOrchestrator(session, company.tenant_id)
            return await orchestrator.enrich_company(UUID(company_id))

    return asyncio.run(_run())


@celery_app.task(name="src.workers.enrichment_tasks.analyze_company")
def analyze_company_task(company_id: str) -> dict:
    """Enrich + AI analyze + score a company."""
    logger.info("analysis_started", company_id=company_id)

    async def _run():
        from uuid import UUID
        from src.core.database import get_session_factory
        from src.application.enrichment.orchestrator import EnrichmentOrchestrator

        factory = get_session_factory()
        async with factory() as session:
            from src.infrastructure.database.repositories.company_repo import SQLAlchemyCompanyRepository
            company_repo = SQLAlchemyCompanyRepository(session)
            company = await company_repo.get_by_id(UUID(company_id))
            if not company:
                return {"error": "Company not found"}

            orchestrator = EnrichmentOrchestrator(session, company.tenant_id)
            return await orchestrator.analyze_and_score(UUID(company_id))

    return asyncio.run(_run())
