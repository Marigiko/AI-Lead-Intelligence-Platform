"""Settings API — user and tenant preferences."""

from fastapi import APIRouter
from pydantic import BaseModel

from src.api.dependencies import CurrentUser, DBSession

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingsResponse(BaseModel):
    language: str = "es"
    timezone: str = "America/Argentina/Buenos_Aires"
    ai_model: str = "gpt-4o-mini"
    email_signature: str | None = None


class UpdateSettingsRequest(BaseModel):
    language: str | None = None
    timezone: str | None = None
    ai_model: str | None = None
    email_signature: str | None = None


@router.get("", response_model=SettingsResponse)
async def get_settings(user: CurrentUser, session: DBSession):
    """Get current user/tenant settings."""
    # Return defaults or stored preferences
    return SettingsResponse()


@router.patch("", response_model=SettingsResponse)
async def update_settings(data: UpdateSettingsRequest, user: CurrentUser, session: DBSession):
    """Update user/tenant settings."""
    # For now, return updated settings. In future, persist to DB.
    return SettingsResponse(
        language=data.language or "es",
        timezone=data.timezone or "America/Argentina/Buenos_Aires",
        ai_model=data.ai_model or "gpt-4o-mini",
        email_signature=data.email_signature,
    )
