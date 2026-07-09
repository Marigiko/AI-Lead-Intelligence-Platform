"""
Enrichment and Scoring API routes.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel

from src.api.dependencies import CurrentUser, DBSession
from src.application.enrichment.use_cases import EnrichmentUseCases

router = APIRouter(prefix="/enrichment", tags=["Enrichment"])


class EnrichRequest(BaseModel):
    company_id: UUID


class AnalyzeRequest(BaseModel):
    company_id: UUID


class BatchEnrichRequest(BaseModel):
    company_ids: list[UUID]


@router.post("/enrich")
async def enrich_company(
    data: EnrichRequest,
    user: CurrentUser,
    session: DBSession,
):
    """Enrich a single company (tech stack, SEO, social)."""
    use_cases = EnrichmentUseCases(session, user.tenant_id)
    return await use_cases.enrich_company(data.company_id)


@router.post("/analyze")
async def analyze_company(
    data: AnalyzeRequest,
    user: CurrentUser,
    session: DBSession,
):
    """Enrich + AI analyze + score a company."""
    use_cases = EnrichmentUseCases(session, user.tenant_id)
    return await use_cases.analyze_and_score(data.company_id)


@router.post("/batch")
async def batch_enrich(
    data: BatchEnrichRequest,
    user: CurrentUser,
    session: DBSession,
):
    """Enrich multiple companies."""
    use_cases = EnrichmentUseCases(session, user.tenant_id)
    return await use_cases.batch_enrich(data.company_ids)
