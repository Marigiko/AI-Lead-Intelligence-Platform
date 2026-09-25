"""Plugins API — list and configure scraper plugins."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.api.dependencies import CurrentUser, DBSession
from src.infrastructure.scraping.plugins.registry import get_plugin_registry

router = APIRouter(prefix="/plugins", tags=["Plugins"])


class PluginConfigRequest(BaseModel):
    source_name: str = Field(..., description="Plugin source name")
    api_key: str | None = Field(None, description="API key for the plugin")
    rpm: int | None = Field(None, ge=1, le=600, description="Rate limit (req/min)")
    enabled: bool | None = Field(None, description="Whether the plugin is enabled")


@router.get("")
async def list_plugins():
    """List all registered scraper plugins."""
    registry = get_plugin_registry()
    return {"plugins": registry.list_plugins()}


@router.patch("/config")
async def update_plugin_config(data: PluginConfigRequest, user: CurrentUser, session: DBSession):
    """Update plugin configuration (API key, rate limit, enabled state)."""
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant access required")

    registry = get_plugin_registry()
    plugin = registry.get(data.source_name)
    if not plugin:
        raise HTTPException(status_code=404, detail=f"Plugin '{data.source_name}' not found")

    # Update plugin configuration
    if data.api_key is not None:
        plugin.configure(api_key=data.api_key)
    if data.rpm is not None:
        plugin.configure(rpm=data.rpm)
    if data.enabled is not None:
        plugin.configure(enabled=data.enabled)

    return {"status": "updated", "plugin": plugin.to_dict()}
