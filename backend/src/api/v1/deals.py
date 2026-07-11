from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from src.application.crm.use_cases import CRMUseCases

if TYPE_CHECKING:
    from datetime import date
    from uuid import UUID

router = APIRouter(prefix="/deals", tags=["Deals"])


# --- DTOs ---


class CreateDealRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    value: float | None = None
    currency: str = "USD"
    stage: str = "Prospeccion"
    probability: int = Field(default=10, ge=0, le=100)
    company_id: UUID | None = None
    contact_id: UUID | None = None
    conversation_id: UUID | None = None
    expected_close_date: date | None = None
    notes: str | None = None
    tags: list[str] | None = None
    services: list[str] | None = None


class UpdateDealRequest(BaseModel):
    title: str | None = None
    value: float | None = None
    stage: str | None = None
    probability: int | None = None
    expected_close_date: date | None = None
    notes: str | None = None
    tags: list[str] | None = None
    services: list[str] | None = None
    lost_reason: str | None = None


class MoveDealRequest(BaseModel):
    stage: str


class AddNoteRequest(BaseModel):
    content: str = Field(..., min_length=1)


class DealResponse(BaseModel):
    id: str
    title: str
    value: float | None
    currency: str
    stage: str
    probability: int
    company_id: str | None
    expected_close_date: str | None
    created_at: str


class PipelineStageResponse(BaseModel):
    id: str
    name: str
    order: int
    probability: int
    color: str | None
    is_won: bool
    is_lost: bool
    deal_count: int
    total_value: float
    deals: list[DealResponse]


class PipelineResponse(BaseModel):
    stages: list[PipelineStageResponse]
    stats: dict[str, Any]


class ActivityResponse(BaseModel):
    id: str
    type: str
    title: str | None
    content: str | None
    deal_id: str | None
    created_at: str


# --- Routes ---


@router.get("/pipeline", response_model=PipelineResponse)
async def get_pipeline(
    user: CurrentUser,
    session: DBSession,
):
    """Get full pipeline view with stages and deals."""
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = CRMUseCases(session, user.tenant_id)
    return await use_cases.get_pipeline()


@router.post("", response_model=DealResponse)
async def create_deal(
    data: CreateDealRequest,
    user: CurrentUser,
    session: DBSession,
) -> DealResponse:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = CRMUseCases(session, user.tenant_id)
    result = await use_cases.create_deal(data.model_dump())
    return DealResponse(**result)


@router.get("/{deal_id}", response_model=DealResponse)
async def get_deal(
    deal_id: UUID,
    user: CurrentUser,
    session: DBSession,
) -> DealResponse:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    from src.infrastructure.database.repositories.deal_repo import SQLAlchemyDealRepository

    repo = SQLAlchemyDealRepository(session)
    deal = await repo.get_by_id(deal_id)
    if not deal or deal.tenant_id != user.tenant_id:
        from src.core.exceptions import NotFoundError

        raise NotFoundError("Deal", str(deal_id))
    return DealResponse(
        id=str(deal.id),
        title=deal.title,
        value=deal.value,
        currency=deal.currency,
        stage=deal.stage,
        probability=deal.probability,
        company_id=str(deal.company_id) if deal.company_id else None,
        expected_close_date=str(deal.expected_close_date) if deal.expected_close_date else None,
        created_at=str(deal.created_at),
    )


@router.patch("/{deal_id}", response_model=dict)
async def update_deal(
    deal_id: UUID,
    data: UpdateDealRequest,
    user: CurrentUser,
    session: DBSession,
) -> dict[str, Any]:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = CRMUseCases(session, user.tenant_id)
    return await use_cases.update_deal(deal_id, data.model_dump(exclude_unset=True))


@router.post("/{deal_id}/move", response_model=dict)
async def move_deal(
    deal_id: UUID,
    data: MoveDealRequest,
    user: CurrentUser,
    session: DBSession,
) -> dict[str, Any]:
    """Move deal to a new stage (Kanban drag & drop)."""
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = CRMUseCases(session, user.tenant_id)
    return await use_cases.move_deal(deal_id, data.stage)


@router.post("/{deal_id}/notes", response_model=dict)
async def add_note(
    deal_id: UUID,
    data: AddNoteRequest,
    user: CurrentUser,
    session: DBSession,
) -> dict[str, Any]:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = CRMUseCases(session, user.tenant_id)
    return await use_cases.add_note(deal_id, data.content)


@router.get("/{deal_id}/timeline", response_model=list[ActivityResponse])
async def get_timeline(
    deal_id: UUID,
    user: CurrentUser,
    session: DBSession,
):
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = CRMUseCases(session, user.tenant_id)
    return await use_cases.get_activity_timeline(deal_id)


@router.get("/activity/recent", response_model=list[ActivityResponse])
async def get_recent_activity(
    user: CurrentUser,
    session: DBSession,
    limit: int = Query(20, ge=1, le=100),
):
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = CRMUseCases(session, user.tenant_id)
    return await use_cases.get_recent_activity(limit=limit)


@router.get("/stats")
async def get_stats(
    user: CurrentUser,
    session: DBSession,
) -> dict[str, Any]:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = CRMUseCases(session, user.tenant_id)
    return await use_cases.get_stats()

if TYPE_CHECKING:
    from src.api.dependencies import CurrentUser, DBSession
