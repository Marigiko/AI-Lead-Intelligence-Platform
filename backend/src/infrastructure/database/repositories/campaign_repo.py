from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import func, select

from src.domain.campaign.models import Campaign, CampaignLead, MessageTemplate
from src.domain.campaign.repository import (
    CampaignLeadRepository,
    CampaignRepository,
    MessageTemplateRepository,
)

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


class SQLAlchemyCampaignRepository(CampaignRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, campaign_id: UUID) -> Campaign | None:
        return await self._session.get(Campaign, campaign_id)

    async def create(self, campaign: Campaign) -> Campaign:
        self._session.add(campaign)
        await self._session.flush()
        await self._session.refresh(campaign)
        return campaign

    async def update(self, campaign: Campaign) -> Campaign:
        await self._session.flush()
        await self._session.refresh(campaign)
        return campaign

    async def delete(self, campaign_id: UUID) -> None:
        campaign = await self.get_by_id(campaign_id)
        if campaign:
            await self._session.delete(campaign)
            await self._session.flush()

    async def list_by_tenant(
        self, tenant_id: UUID, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[Campaign], int]:
        base = select(Campaign).where(Campaign.tenant_id == tenant_id)
        count = (
            await self._session.execute(select(func.count()).select_from(base.subquery()))
        ).scalar() or 0
        stmt = base.order_by(Campaign.created_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), count


class SQLAlchemyCampaignLeadRepository(CampaignLeadRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, lead: CampaignLead) -> CampaignLead:
        self._session.add(lead)
        await self._session.flush()
        await self._session.refresh(lead)
        return lead

    async def bulk_create(self, leads: list[CampaignLead]) -> list[CampaignLead]:
        self._session.add_all(leads)
        await self._session.flush()
        for lead in leads:
            await self._session.refresh(lead)
        return leads

    async def list_by_campaign(
        self, campaign_id: UUID, *, status: str | None = None, limit: int = 100
    ) -> list[CampaignLead]:
        stmt = select(CampaignLead).where(CampaignLead.campaign_id == campaign_id)
        if status:
            stmt = stmt.where(CampaignLead.status == status)
        stmt = stmt.order_by(CampaignLead.created_at).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, lead: CampaignLead) -> CampaignLead:
        await self._session.flush()
        await self._session.refresh(lead)
        return lead

    async def get_by_tracking_id(self, tracking_id: str) -> CampaignLead | None:
        stmt = select(CampaignLead).where(CampaignLead.tracking_id == tracking_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_campaign_stats(self, campaign_id: UUID) -> dict[str, int]:
        base = select(CampaignLead).where(CampaignLead.campaign_id == campaign_id)
        total = (
            await self._session.execute(select(func.count()).select_from(base.subquery()))
        ).scalar() or 0
        sent = (
            await self._session.execute(
                select(func.count()).select_from(
                    base.where(
                        CampaignLead.status.in_(
                            ["sent", "delivered", "opened", "clicked", "replied"]
                        )
                    ).subquery()
                )
            )
        ).scalar() or 0
        opened = (
            await self._session.execute(
                select(func.count()).select_from(
                    base.where(CampaignLead.opened_at.isnot(None)).subquery()
                )
            )
        ).scalar() or 0
        clicked = (
            await self._session.execute(
                select(func.count()).select_from(
                    base.where(CampaignLead.clicked_at.isnot(None)).subquery()
                )
            )
        ).scalar() or 0
        replied = (
            await self._session.execute(
                select(func.count()).select_from(
                    base.where(CampaignLead.replied_at.isnot(None)).subquery()
                )
            )
        ).scalar() or 0
        bounced = (
            await self._session.execute(
                select(func.count()).select_from(
                    base.where(CampaignLead.bounced_at.isnot(None)).subquery()
                )
            )
        ).scalar() or 0

        return {
            "total": total,
            "sent": sent,
            "opened": opened,
            "clicked": clicked,
            "replied": replied,
            "bounced": bounced,
        }


class SQLAlchemyMessageTemplateRepository(MessageTemplateRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, template_id: UUID) -> MessageTemplate | None:
        return await self._session.get(MessageTemplate, template_id)

    async def create(self, template: MessageTemplate) -> MessageTemplate:
        self._session.add(template)
        await self._session.flush()
        await self._session.refresh(template)
        return template

    async def list_by_tenant(self, tenant_id: UUID) -> list[MessageTemplate]:
        stmt = select(MessageTemplate).where(MessageTemplate.tenant_id == tenant_id)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def delete(self, template_id: UUID) -> None:
        template = await self.get_by_id(template_id)
        if template:
            await self._session.delete(template)
            await self._session.flush()
