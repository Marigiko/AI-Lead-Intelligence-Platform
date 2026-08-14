"""Deliverability API — inbox rotation, SMTP verification, warmup."""
from fastapi import APIRouter
from pydantic import BaseModel

from src.api.dependencies import CurrentUser
from src.infrastructure.deliverability.rotator import (
    InboxConfig,
    get_inbox_rotator,
    get_smtp_verifier,
)

router = APIRouter(prefix="/deliverability", tags=["Deliverability"])


class AddInboxRequest(BaseModel):
    host: str
    port: int = 587
    username: str
    password: str
    from_name: str = ""
    from_email: str = ""
    daily_limit: int = 30


class VerifyEmailRequest(BaseModel):
    email: str


@router.get("/inboxes")
async def list_inboxes(user: CurrentUser):
    """List all configured inboxes with stats."""
    rotator = get_inbox_rotator()
    return {"inboxes": rotator.get_stats()}


@router.post("/inboxes")
async def add_inbox(data: AddInboxRequest, user: CurrentUser):
    """Add a new sending inbox."""
    rotator = get_inbox_rotator()
    inbox = InboxConfig(
        host=data.host,
        port=data.port,
        username=data.username,
        password=data.password,
        from_name=data.from_name,
        from_email=data.from_email or data.username,
        daily_limit=data.daily_limit,
    )
    rotator.add_inbox(inbox)
    return {"id": inbox.id, "username": inbox.username}


@router.delete("/inboxes/{inbox_id}")
async def remove_inbox(inbox_id: str, user: CurrentUser):
    """Remove an inbox."""
    rotator = get_inbox_rotator()
    rotator.remove_inbox(inbox_id)
    return {"removed": True}


@router.post("/verify-email")
async def verify_email(data: VerifyEmailRequest, user: CurrentUser):
    """Verify email deliverability."""
    verifier = get_smtp_verifier()
    result = await verifier.verify(data.email)
    return result


@router.get("/stats")
async def get_stats(user: CurrentUser):
    """Get deliverability stats."""
    rotator = get_inbox_rotator()
    return {
        "inboxes": rotator.get_stats(),
        "total_inboxes": rotator.inbox_count,
    }
