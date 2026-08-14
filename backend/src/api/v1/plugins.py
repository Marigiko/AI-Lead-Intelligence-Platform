"""Plugins API — list registered scraper plugins."""
from fastapi import APIRouter

from src.infrastructure.scraping.plugins.registry import get_plugin_registry

router = APIRouter(prefix="/plugins", tags=["Plugins"])


@router.get("")
async def list_plugins():
    """List all registered scraper plugins."""
    registry = get_plugin_registry()
    return {"plugins": registry.list_plugins()}
