from __future__ import annotations

import asyncio
from typing import Any

import structlog

from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(name="src.workers.outreach_tasks.send_campaign_email")  # type: ignore[reportUntypedFunctionDecorator]
def send_campaign_email(campaign_lead_id: str) -> dict[str, Any]:
    """Send a single campaign email."""
    logger.info("email_send_started", campaign_lead_id=campaign_lead_id)

    async def _run():
        from uuid import UUID

        from src.core.database import get_session_factory
        from src.infrastructure.database.repositories.campaign_repo import (
            SQLAlchemyCampaignLeadRepository,
        )
        from src.infrastructure.email.sender import EmailMessage, get_email_sender

        factory = get_session_factory()
        async with factory() as session:
            repo = SQLAlchemyCampaignLeadRepository(session)
            from src.domain.campaign.models import CampaignLead

            lead = await session.get(CampaignLead, UUID(campaign_lead_id))
            if not lead or not lead.email or not lead.message_content:
                return {"error": "Lead not found or no content"}

            sender = get_email_sender()
            message = EmailMessage(
                to=lead.email,
                subject=lead.subject or "Contacto",
                html_body=lead.message_content,
                tracking_id=lead.tracking_id or "",
                campaign_lead_id=campaign_lead_id,
            )
            result = await sender.send(message)

            if result.success:
                lead.status = "sent"
                lead.sent_at = result.sent_at
            else:
                lead.status = "failed"
                lead.error_message = result.error

            await repo.update(lead)
            await session.commit()
            return {"status": lead.status, "message_id": result.message_id}

    return asyncio.run(_run())


@celery_app.task(name="src.workers.outreach_tasks.send_campaign_batch")  # type: ignore[reportUntypedFunctionDecorator]
def send_campaign_batch(campaign_id: str) -> dict[str, Any]:
    """Send all pending emails in a campaign as a batch."""
    logger.info("campaign_batch_started", campaign_id=campaign_id)

    async def _run():
        from uuid import UUID

        from src.core.database import get_session_factory
        from src.infrastructure.database.repositories.campaign_repo import (
            SQLAlchemyCampaignLeadRepository,
            SQLAlchemyCampaignRepository,
        )
        from src.infrastructure.email.sender import EmailMessage, get_email_sender

        factory = get_session_factory()
        async with factory() as session:
            campaign_repo = SQLAlchemyCampaignRepository(session)
            lead_repo = SQLAlchemyCampaignLeadRepository(session)

            campaign = await campaign_repo.get_by_id(UUID(campaign_id))
            if not campaign:
                return {"error": "Campaign not found"}

            leads = await lead_repo.list_by_campaign(UUID(campaign_id), status="pending")
            sender = get_email_sender()
            sent = 0
            failed = 0

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
                result = await sender.send(message)

                if result.success:
                    lead.status = "sent"
                    lead.sent_at = result.sent_at
                    sent += 1
                else:
                    lead.status = "failed"
                    lead.error_message = result.error
                    failed += 1

                await lead_repo.update(lead)

            stats = await lead_repo.get_campaign_stats(UUID(campaign_id))
            campaign.stats = stats
            campaign.status = "sent" if sent > 0 else "failed"
            await campaign_repo.update(campaign)
            await session.commit()

            return {"sent": sent, "failed": failed, "total": len(leads)}

    return asyncio.run(_run())
