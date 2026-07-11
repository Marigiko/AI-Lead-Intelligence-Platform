from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

from src.infrastructure.database.repositories.company_repo import SQLAlchemyCompanyRepository

if TYPE_CHECKING:
    from uuid import UUID

    from src.domain.company.repository import CompanyRepository

router = APIRouter(prefix="/companies", tags=["Companies"])


def _get_repo(session: AsyncSession) -> CompanyRepository:
    return SQLAlchemyCompanyRepository(session)


# --- DTOs ---


class CompanyResponse(BaseModel):
    id: UUID
    name: str
    domain: str | None
    industry: str | None
    city: str | None
    province: str | None
    country: str | None
    phone: str | None
    email: str | None
    website: str | None = None
    opportunity_score: int
    status: str
    created_at: Any

    model_config = {"from_attributes": True}


class CompanyListResponse(BaseModel):
    items: list[CompanyResponse]
    total: int
    offset: int
    limit: int


class CompanyDetailResponse(CompanyResponse):
    legal_name: str | None
    employee_count_est: int | None
    revenue_est: float | None
    description: str | None
    logo_url: str | None
    latitude: float | None
    longitude: float | None
    whatsapp: str | None
    linkedin_url: str | None
    facebook_url: str | None
    instagram_url: str | None
    google_place_id: str | None
    google_rating: float | None
    google_review_count: int | None
    tech_stack: list[str]
    cms: str | None
    framework: str | None
    has_ssl: bool | None
    has_whatsapp: bool | None
    has_chatbot: bool | None
    seo_score: int | None
    page_speed_mobile: int | None
    page_speed_desktop: int | None
    opportunity_breakdown: dict[str, Any]
    opportunity_analysis: str | None
    recommended_services: list[str] | None
    estimated_deal_value: float | None


# --- Routes ---


@router.get("", response_model=CompanyListResponse)
async def list_companies(
    user: CurrentUser,
    session: DBSession,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status: str | None = None,
    industry: str | None = None,
    city: str | None = None,
    min_score: int | None = None,
    sort_by: str = "opportunity_score",
    sort_order: str = "desc",
):
    repo = _get_repo(session)
    filters: dict[str, Any] = {}
    if search:
        filters["search"] = search
    if status:
        filters["status"] = status
    if industry:
        filters["industry"] = industry
    if city:
        filters["city"] = city
    if min_score is not None:
        filters["min_score"] = min_score

    if user.tenant_id is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="Invalid tenant")

    items, total = await repo.list_by_tenant(
        user.tenant_id,
        offset=offset,
        limit=limit,
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return CompanyListResponse(
        items=[CompanyResponse.model_validate(c) for c in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{company_id}", response_model=CompanyDetailResponse)
async def get_company(
    company_id: UUID,
    user: CurrentUser,
    session: DBSession,
):
    repo = _get_repo(session)
    company = await repo.get_by_id(company_id)
    if not company or company.tenant_id != user.tenant_id:
        from src.core.exceptions import NotFoundError

        raise NotFoundError("Company", str(company_id))
    return CompanyDetailResponse.model_validate(company)


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from src.api.dependencies import CurrentUser, DBSession
