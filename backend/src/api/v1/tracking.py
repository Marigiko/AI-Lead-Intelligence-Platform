from __future__ import annotations

from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from src.core.database import get_session_factory
from src.infrastructure.database.repositories.campaign_repo import SQLAlchemyCampaignLeadRepository

router = APIRouter(prefix="/campaigns/track", tags=["Tracking"])

logger = structlog.get_logger()

# 1x1 transparent GIF pixel
TRACKING_PIXEL = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff"
    b"\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,\x00"
    b"\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


@router.get("/open/{tracking_id}")
async def track_open(tracking_id: str):
    """Track email opens via tracking pixel."""
    try:
        factory = get_session_factory()
        async with factory() as session:
            repo = SQLAlchemyCampaignLeadRepository(session)
            lead = await repo.get_by_tracking_id(tracking_id)
            if lead and not lead.opened_at:
                lead.opened_at = datetime.now(UTC)
                lead.status = "opened"
                await repo.update(lead)
                await session.commit()
    except Exception as exc:
        logger.warning("tracking_open_failed", tracking_id=tracking_id, error=str(exc))

    return Response(content=TRACKING_PIXEL, media_type="image/gif")


@router.get("/click/{tracking_id}")
async def track_click(tracking_id: str, url: str = ""):
    """Track email link clicks."""
    from fastapi.responses import RedirectResponse

    try:
        factory = get_session_factory()
        async with factory() as session:
            repo = SQLAlchemyCampaignLeadRepository(session)
            lead = await repo.get_by_tracking_id(tracking_id)
            if lead and not lead.clicked_at:
                lead.clicked_at = datetime.now(UTC)
                lead.status = "clicked"
                await repo.update(lead)
                await session.commit()
    except Exception as exc:
        logger.warning("tracking_click_failed", tracking_id=tracking_id, error=str(exc))

    return RedirectResponse(url=url or "/", status_code=302)


@router.post("/unsubscribe/{lead_id}")
async def unsubscribe(lead_id: str):
    """Handle unsubscribe requests."""
    from uuid import UUID

    try:
        factory = get_session_factory()
        async with factory() as session:
            from src.domain.campaign.models import CampaignLead

            lead = await session.get(CampaignLead, UUID(lead_id))
            if lead:
                lead.unsubscribed_at = datetime.now(UTC)
                lead.status = "unsubscribed"
                await session.commit()
    except Exception as exc:
        logger.error("unsubscribe_failed", lead_id=lead_id, error=str(exc))
        raise HTTPException(status_code=500, detail="No se pudo procesar la baja") from exc

    return {"message": "Te has dado de baja correctamente"}
