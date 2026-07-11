from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from src.application.outreach.use_cases import OutreachUseCases

if TYPE_CHECKING:
    from uuid import UUID

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


# --- DTOs ---


class CreateCampaignRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(default="email", pattern="^(email|whatsapp|linkedin|multi)$")
    subject: str = ""
    ai_prompt: str = ""
    settings: dict[str, str] = Field(default_factory=dict)


class AddLeadsRequest(BaseModel):
    company_ids: list[UUID]


class GenerateMessagesRequest(BaseModel):
    sender_name: str = ""
    sender_company: str = ""
    sender_services: str = "servicios digitales"


class CampaignResponse(BaseModel):
    id: UUID
    name: str
    type: str
    status: str
    subject: str | None
    stats: dict[str, int]
    created_at: str


class CampaignListResponse(BaseModel):
    items: list[CampaignResponse]
    total: int


class GeneratedMessageResponse(BaseModel):
    subject: str
    body: str
    channel: str
    company_id: UUID
    personalization_notes: str = ""


# --- Routes ---


@router.get("", response_model=CampaignListResponse)
async def list_campaigns(
    user: CurrentUser,
    session: DBSession,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> CampaignListResponse:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = OutreachUseCases(session, user.tenant_id)
    items, total = await use_cases.list_campaigns(offset=offset, limit=limit)
    return CampaignListResponse(
        items=[
            CampaignResponse(
                id=c.id,
                name=c.name,
                type=c.type,
                status=c.status,
                subject=c.subject,
                stats=c.stats,
                created_at=str(c.created_at),
            )
            for c in items
        ],
        total=total,
    )


@router.post("", response_model=CampaignResponse)
async def create_campaign(
    data: CreateCampaignRequest,
    user: CurrentUser,
    session: DBSession,
) -> CampaignResponse:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = OutreachUseCases(session, user.tenant_id)
    from src.application.outreach.dto import CreateCampaignRequest as Req

    result = await use_cases.create_campaign(
        Req(
            name=data.name,
            type=data.type,
            subject=data.subject,
            ai_prompt=data.ai_prompt,
            settings=data.settings,
        )
    )
    return CampaignResponse(
        id=result.id,
        name=result.name,
        type=result.type,
        status=result.status,
        subject=result.subject,
        stats=result.stats,
        created_at=str(result.created_at),
    )


@router.post("/{campaign_id}/leads")
async def add_leads(
    campaign_id: UUID,
    data: AddLeadsRequest,
    user: CurrentUser,
    session: DBSession,
) -> dict[str, object]:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = OutreachUseCases(session, user.tenant_id)
    count = await use_cases.add_leads_to_campaign(campaign_id, data.company_ids)
    return {"added": count, "campaign_id": str(campaign_id)}


@router.post("/{campaign_id}/generate")
async def generate_messages(
    campaign_id: UUID,
    data: GenerateMessagesRequest,
    user: CurrentUser,
    session: DBSession,
) -> dict[str, object]:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = OutreachUseCases(session, user.tenant_id)
    messages = await use_cases.generate_messages(
        campaign_id,
        sender_info={
            "name": data.sender_name or user.full_name or "",
            "company": data.sender_company,
            "services": data.sender_services,
        },
    )
    return {
        "generated": len(messages),
        "messages": [
            GeneratedMessageResponse(
                subject=m.subject,
                body=m.body,
                channel=m.channel,
                company_id=m.company_id,
                personalization_notes=m.personalization_notes,
            )
            for m in messages
        ],
    }


@router.post("/{campaign_id}/send")
async def send_campaign(
    campaign_id: UUID,
    user: CurrentUser,
    session: DBSession,
) -> dict[str, object]:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = OutreachUseCases(session, user.tenant_id)
    return await use_cases.send_campaign(campaign_id)


@router.get("/{campaign_id}/stats")
async def get_stats(
    campaign_id: UUID,
    user: CurrentUser,
    session: DBSession,
) -> dict[str, object]:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = OutreachUseCases(session, user.tenant_id)
    return await use_cases.get_campaign_stats(campaign_id)


if TYPE_CHECKING:
    from src.api.dependencies import CurrentUser, DBSession
