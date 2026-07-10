"""
Enrichment and Scoring API routes.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.application.enrichment.use_cases import EnrichmentUseCases

if TYPE_CHECKING:
    from uuid import UUID

    from src.api.dependencies import CurrentUser, DBSession

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
) -> dict[str, object]:
    """Enrich a single company (tech stack, SEO, social)."""
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = EnrichmentUseCases(session, user.tenant_id)
    return await use_cases.enrich_company(data.company_id)


@router.post("/analyze")
async def analyze_company(
    data: AnalyzeRequest,
    user: CurrentUser,
    session: DBSession,
) -> dict[str, object]:
    """Enrich + AI analyze + score a company."""
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = EnrichmentUseCases(session, user.tenant_id)
    return await use_cases.analyze_and_score(data.company_id)


@router.post("/batch")
async def batch_enrich(
    data: BatchEnrichRequest,
    user: CurrentUser,
    session: DBSession,
) -> list[dict[str, object]]:
    """Enrich multiple companies."""
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = EnrichmentUseCases(session, user.tenant_id)
    return await use_cases.batch_enrich(data.company_ids)
