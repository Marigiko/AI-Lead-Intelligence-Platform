"""
Email tracking endpoints — open pixel and click tracking.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import Response

from src.core.database import get_session_factory
from src.infrastructure.database.repositories.campaign_repo import SQLAlchemyCampaignLeadRepository

router = APIRouter(prefix="/campaigns/track", tags=["Tracking"])

# 1x1 transparent GIF pixel
TRACKING_PIXEL = bytes(
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
                lead.opened_at = datetime.now(timezone.utc)
                lead.status = "opened"
                await repo.update(lead)
                await session.commit()
    except Exception:
        pass  # Don't fail the request

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
                lead.clicked_at = datetime.now(timezone.utc)
                lead.status = "clicked"
                await repo.update(lead)
                await session.commit()
    except Exception:
        pass

    return RedirectResponse(url=url or "/", status_code=302)


@router.post("/unsubscribe/{lead_id}")
async def unsubscribe(lead_id: str):
    """Handle unsubscribe requests."""
    from uuid import UUID
    try:
        factory = get_session_factory()
        async with factory() as session:
            repo = SQLAlchemyCampaignLeadRepository(session)
            from src.domain.campaign.models import CampaignLead
            lead = await session.get(CampaignLead, UUID(lead_id))
            if lead:
                lead.unsubscribed_at = datetime.now(timezone.utc)
                lead.status = "unsubscribed"
                await session.commit()
    except Exception:
        pass

    return {"message": "Te has dado de baja correctamente"}
