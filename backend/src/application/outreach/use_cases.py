"""
Outreach application use cases.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.outreach.dto import (
    CampaignDTO,
    CreateCampaignRequest,
    GenerateMessageRequest,
    GeneratedMessageDTO,
)
from src.domain.campaign.models import Campaign, CampaignLead
from src.domain.campaign.repository import CampaignRepository, CampaignLeadRepository
from src.domain.company.repository import CompanyRepository
from src.infrastructure.ai.message_generator import get_message_generator
from src.infrastructure.database.repositories.campaign_repo import (
    SQLAlchemyCampaignLeadRepository,
    SQLAlchemyCampaignRepository,
)
from src.infrastructure.database.repositories.company_repo import SQLAlchemyCompanyRepository
from src.infrastructure.email.sender import EmailMessage, get_email_sender

logger = structlog.get_logger()


class OutreachUseCases:
    def __init__(self, session: AsyncSession, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id
        self._campaign_repo: CampaignRepository = SQLAlchemyCampaignRepository(session)
        self._lead_repo: CampaignLeadRepository = SQLAlchemyCampaignLeadRepository(session)
        self._company_repo: CompanyRepository = SQLAlchemyCompanyRepository(session)
        self._message_gen = get_message_generator()
        self._email_sender = get_email_sender()

    async def create_campaign(self, data: CreateCampaignRequest) -> CampaignDTO:
        """Create a new campaign."""
        campaign = Campaign(
            tenant_id=self._tenant_id,
            name=data.name,
            type=data.type,
            subject=data.subject,
            ai_prompt=data.ai_prompt,
            settings=data.settings,
            stats={"total": 0, "sent": 0, "opened": 0, "clicked": 0, "replied": 0},
        )
        campaign = await self._campaign_repo.create(campaign)
        await self._session.commit()

        return CampaignDTO(
            id=campaign.id,
            name=campaign.name,
            type=campaign.type,
            status=campaign.status,
            subject=campaign.subject,
            stats=campaign.stats,
            created_at=campaign.created_at,
        )

    async def list_campaigns(
        self, offset: int = 0, limit: int = 20
    ) -> tuple[list[CampaignDTO], int]:
        """List campaigns for the tenant."""
        campaigns, total = await self._campaign_repo.list_by_tenant(
            self._tenant_id, offset=offset, limit=limit
        )
        dtos = [
            CampaignDTO(
                id=c.id, name=c.name, type=c.type, status=c.status,
                subject=c.subject, stats=c.stats, created_at=c.created_at,
            )
            for c in campaigns
        ]
        return dtos, total

    async def add_leads_to_campaign(
        self, campaign_id: UUID, company_ids: list[UUID]
    ) -> int:
        """Add companies as leads to a campaign."""
        campaign = await self._campaign_repo.get_by_id(campaign_id)
        if not campaign or campaign.tenant_id != self._tenant_id:
            return 0

        leads = []
        for cid in company_ids:
            company = await self._company_repo.get_by_id(cid)
            if not company:
                continue

            email = company.email
            if not email:
                continue

            lead = CampaignLead(
                campaign_id=campaign_id,
                company_id=cid,
                email=email,
                status="pending",
                tracking_id=str(uuid.uuid4()),
            )
            leads.append(lead)

        if leads:
            await self._lead_repo.bulk_create(leads)
            campaign.stats["total"] = len(leads)
            await self._campaign_repo.update(campaign)
            await self._session.commit()

        return len(leads)

    async def generate_messages(
        self, campaign_id: UUID, sender_info: dict[str, str]
    ) -> list[GeneratedMessageDTO]:
        """Generate personalized messages for all leads in a campaign."""
        campaign = await self._campaign_repo.get_by_id(campaign_id)
        if not campaign or campaign.tenant_id != self._tenant_id:
            return []

        leads = await self._lead_repo.list_by_campaign(campaign_id, status="pending")
        generated = []

        for lead in leads:
            if not lead.company_id:
                continue

            company = await self._company_repo.get_by_id(lead.company_id)
            if not company:
                continue

            company_data = {
                "name": company.name,
                "industry": company.industry,
                "city": company.city,
                "domain": company.domain,
            }

            opportunity_data = {
                "opportunity_score": company.opportunity_score,
                "recommended_services": company.recommended_services or [],
                "analysis": company.opportunity_analysis or "",
            }

            try:
                msg = await self._message_gen.generate_email(
                    company_data=company_data,
                    opportunity_data=opportunity_data,
                    sender_info=sender_info,
                    tone=campaign.settings.get("tone", "professional"),
                )

                lead.subject = msg.subject
                lead.message_content = msg.body
                await self._lead_repo.update(lead)

                generated.append(GeneratedMessageDTO(
                    subject=msg.subject,
                    body=msg.body,
                    channel="email",
                    company_id=lead.company_id,
                    personalization_notes=msg.personalization_notes,
                ))
            except Exception as e:
                logger.error("message_generation_failed", lead_id=str(lead.id), error=str(e))

        await self._session.commit()
        return generated

    async def send_campaign(self, campaign_id: UUID) -> dict:
        """Send all pending messages in a campaign."""
        campaign = await self._campaign_repo.get_by_id(campaign_id)
        if not campaign or campaign.tenant_id != self._tenant_id:
            return {"error": "Campaign not found"}

        leads = await self._lead_repo.list_by_campaign(campaign_id, status="pending")
        sent_count = 0
        failed_count = 0

        for lead in leads:
            if not lead.email or not lead.message_content:
                continue

            message = EmailMessage(
                to=lead.email,
                subject=lead.subject or campaign.subject or "Contacto",
                html_body=lead.message_content,
                tracking_id=lead.tracking_id or "",
                campaign_lead_id=str(lead.id),
            )

            result = await self._email_sender.send(message)

            if result.success:
                lead.status = "sent"
                lead.sent_at = result.sent_at
                sent_count += 1
            else:
                lead.status = "failed"
                lead.error_message = result.error
                failed_count += 1

            await self._lead_repo.update(lead)

        # Update campaign stats
        stats = await self._lead_repo.get_campaign_stats(campaign_id)
        campaign.stats = stats
        campaign.status = "sent" if sent_count > 0 else "failed"
        await self._campaign_repo.update(campaign)
        await self._session.commit()

        return {
            "campaign_id": str(campaign_id),
            "sent": sent_count,
            "failed": failed_count,
            "total": len(leads),
        }

    async def get_campaign_stats(self, campaign_id: UUID) -> dict:
        """Get detailed campaign statistics."""
        campaign = await self._campaign_repo.get_by_id(campaign_id)
        if not campaign or campaign.tenant_id != self._tenant_id:
            return {"error": "Campaign not found"}

        stats = await self._lead_repo.get_campaign_stats(campaign_id)
        return {
            "campaign_id": str(campaign_id),
            "name": campaign.name,
            "status": campaign.status,
            "stats": stats,
            "open_rate": (stats["opened"] / stats["sent"] * 100) if stats["sent"] > 0 else 0,
            "reply_rate": (stats["replied"] / stats["sent"] * 100) if stats["sent"] > 0 else 0,
        }
