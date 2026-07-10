"""
Enrichment orchestrator — runs all enrichment tasks for a company.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid4

import structlog

from src.core.events import DomainEvent, get_event_bus
from src.infrastructure.ai.gateway import get_ai_gateway
from src.infrastructure.database.repositories.company_repo import SQLAlchemyCompanyRepository
from src.infrastructure.scraping.seo_analyzer import get_seo_analyzer
from src.infrastructure.scraping.social_detector import get_social_detector
from src.infrastructure.scraping.tech_detector import get_tech_detector

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from src.domain.company.repository import CompanyRepository

logger = structlog.get_logger()


@dataclass(frozen=True)
class CompanyEnriched(DomainEvent):
    company_id: UUID = field(default_factory=uuid4)
    fields_updated: list[str] = field(default_factory=list[str])


class EnrichmentOrchestrator:
    """Orchestrates all enrichment tasks for a company."""

    def __init__(self, session: AsyncSession, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id
        self._company_repo: CompanyRepository = SQLAlchemyCompanyRepository(session)
        self._tech_detector = get_tech_detector()
        self._seo_analyzer = get_seo_analyzer()
        self._social_detector = get_social_detector()
        self._ai_gateway = get_ai_gateway()
        self._event_bus = get_event_bus()

    async def enrich_company(self, company_id: UUID) -> dict[str, Any]:
        """Run full enrichment pipeline for a single company."""
        company = await self._company_repo.get_by_id(company_id)
        if not company or company.tenant_id != self._tenant_id:
            return {"error": "Company not found"}

        if not company.domain:
            return {"error": "No website domain to analyze"}

        url = f"https://{company.domain}"
        updated_fields: list[str] = []

        logger.info("enrichment_started", company_id=str(company_id), domain=company.domain)

        # 1. Tech stack detection
        try:
            tech_result = await self._tech_detector.detect(url)
            company.cms = tech_result.cms
            company.framework = tech_result.framework
            company.hosting = tech_result.hosting
            company.tech_stack = tech_result.technologies
            company.has_ssl = tech_result.has_ssl
            company.has_whatsapp = tech_result.has_whatsapp
            company.has_chatbot = tech_result.has_chatbot
            company.has_crm = tech_result.has_crm
            company.has_ecommerce = tech_result.has_ecommerce
            updated_fields.extend(["tech_stack", "cms", "framework", "hosting"])
        except Exception as e:
            logger.error("tech_detection_failed", company_id=str(company_id), error=str(e))

        # 2. SEO analysis
        try:
            seo_result = await self._seo_analyzer.analyze(url)
            company.seo_score = seo_result.score
            company.page_speed_mobile = seo_result.response_time_ms  # Simplified
            updated_fields.extend(["seo_score"])
        except Exception as e:
            logger.error("seo_analysis_failed", company_id=str(company_id), error=str(e))

        # 3. Social media detection
        try:
            social_result = await self._social_detector.detect(url)
            if social_result.facebook_url:
                company.facebook_url = social_result.facebook_url
            if social_result.instagram_url:
                company.instagram_url = social_result.instagram_url
            if social_result.linkedin_url:
                company.linkedin_url = social_result.linkedin_url
            if social_result.tiktok_url:
                company.tiktok_url = social_result.tiktok_url
            updated_fields.extend(["facebook_url", "instagram_url", "linkedin_url"])
        except Exception as e:
            logger.error("social_detection_failed", company_id=str(company_id), error=str(e))

        # Update timestamp
        company.last_enriched_at = datetime.now(UTC)
        await self._company_repo.update(company)

        # Emit event
        await self._event_bus.publish(
            CompanyEnriched(
                tenant_id=self._tenant_id,
                company_id=company_id,
                fields_updated=updated_fields,
            )
        )

        await self._session.commit()

        logger.info(
            "enrichment_completed",
            company_id=str(company_id),
            fields_updated=updated_fields,
        )

        return {
            "company_id": str(company_id),
            "fields_updated": updated_fields,
            "tech_stack": company.tech_stack,
            "seo_score": company.seo_score,
        }

    async def analyze_and_score(self, company_id: UUID) -> dict[str, Any]:
        """Run enrichment + AI analysis + scoring."""
        # First enrich
        enrich_result: dict[str, Any] = await self.enrich_company(company_id)
        if "error" in enrich_result:
            return enrich_result

        company = await self._company_repo.get_by_id(company_id)
        if not company:
            return {"error": "Company not found after enrichment"}

        # AI analysis
        try:
            ai_result = await self._ai_gateway.analyze_company(
                company_data={
                    "name": company.name,
                    "industry": company.industry,
                    "city": company.city,
                    "province": company.province,
                    "domain": company.domain,
                },
                seo_data={"score": company.seo_score} if company.seo_score else None,
                tech_data={
                    "technologies": company.tech_stack,
                    "has_ssl": company.has_ssl,
                    "has_chatbot": company.has_chatbot,
                    "has_ecommerce": company.has_ecommerce,
                }
                if company.tech_stack
                else None,
                social_data={
                    "social_count": sum(
                        [
                            1
                            for u in [
                                company.facebook_url,
                                company.instagram_url,
                                company.linkedin_url,
                            ]
                            if u
                        ]
                    )
                },
            )

            # Update company with AI results
            company.opportunity_score = ai_result.get("opportunity_score", 0)
            company.opportunity_breakdown = ai_result.get("opportunity_breakdown", {})
            company.opportunity_analysis = ai_result.get("analysis", "")
            company.recommended_services = ai_result.get("recommended_services", [])
            company.estimated_deal_value = ai_result.get("estimated_deal_value", 0)
            company.last_analyzed_at = datetime.now(UTC)
            company.status = "scored"

            await self._company_repo.update(company)
            await self._session.commit()

            return {
                "company_id": str(company_id),
                "opportunity_score": company.opportunity_score,
                "analysis": company.opportunity_analysis,
                "recommended_services": company.recommended_services,
                "estimated_deal_value": company.estimated_deal_value,
            }

        except Exception as e:
            logger.error("ai_analysis_failed", company_id=str(company_id), error=str(e))
            return {
                "company_id": str(company_id),
                "opportunity_score": 0,
                "error": f"AI analysis failed: {str(e)[:100]}",
            }

    async def batch_enrich(self, company_ids: list[UUID]) -> list[dict[str, Any]]:
        """Enrich multiple companies sequentially."""
        results: list[dict[str, Any]] = []
        for cid in company_ids:
            result: dict[str, Any] = await self.enrich_company(cid)
            results.append(result)
        return results
