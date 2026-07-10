from __future__ import annotations

import asyncio
from typing import Any

import structlog

from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(name="src.workers.scoring_tasks.score_company")  # type: ignore[reportUntypedFunctionDecorator]
def score_company(company_id: str) -> dict[str, Any]:
    """Calculate opportunity score for a company using the ScoringEngine."""
    logger.info("scoring_started", company_id=company_id)

    async def _run():
        from uuid import UUID

        from src.application.scoring.engine import get_scoring_engine
        from src.core.database import get_session_factory

        factory = get_session_factory()
        async with factory() as session:
            from src.infrastructure.database.repositories.company_repo import (
                SQLAlchemyCompanyRepository,
            )

            company_repo = SQLAlchemyCompanyRepository(session)
            company = await company_repo.get_by_id(UUID(company_id))
            if not company:
                return {"error": "Company not found"}

            company_data = {
                "domain": company.domain,
                "website": company.domain,
                "industry": company.industry,
                "city": company.city,
                "employee_count": company.employee_count_est,
                "tech_stack": company.tech_stack or [],
                "google_place_id": company.google_place_id,
                "facebook_url": company.facebook_url,
                "linkedin_url": company.linkedin_url,
                "seo_score": company.seo_score,
                "has_ssl": company.has_ssl,
                "has_whatsapp": company.has_whatsapp,
                "has_chatbot": company.has_chatbot,
                "has_crm": company.has_crm,
                "has_ecommerce": company.has_ecommerce,
            }
            engine = get_scoring_engine()
            breakdown = engine.calculate_score(company_data)

            company.opportunity_score = breakdown.total
            company.opportunity_breakdown = breakdown.to_dict()
            await company_repo.update(company)

            return {
                "company_id": company_id,
                "score": breakdown.total,
                "breakdown": breakdown.to_dict(),
            }

    return asyncio.run(_run())
