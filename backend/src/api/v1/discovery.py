from __future__ import annotations

from typing import TYPE_CHECKING, Any, cast

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.application.discovery.dto import DiscoverySearchRequest, DiscoverySearchResponse
from src.application.discovery.use_cases import DiscoveryUseCases

if TYPE_CHECKING:
    from src.api.dependencies import CurrentUser, DBSession

router = APIRouter(prefix="/discovery", tags=["Discovery"])


class SearchRequest(BaseModel):
    location: str = Field(
        ..., description="City, address, or region", examples=["Resistencia, Chaco"]
    )
    radius_km: int = Field(default=50, ge=1, le=500, description="Search radius in km")
    intent: str = Field(
        ...,
        description="Natural language description of what you're looking for",
        examples=["Empresas con pagina web obsoleta que necesiten actualizacion"],
    )
    max_results: int = Field(default=100, ge=1, le=1000)
    sources: list[str] = Field(default=[], description="Specific sources to use (empty = all)")


class IntentParseRequest(BaseModel):
    intent: str = Field(..., description="Natural language intent to parse")


class IntentParseResponse(BaseModel):
    keywords: list[str]
    industries: list[str]
    signals: list[str]
    sources: list[str]
    has_website: bool | None


class GeocodeRequest(BaseModel):
    location: str


class GeocodeResponse(BaseModel):
    latitude: float
    longitude: float
    display_name: str
    country: str
    state: str
    city: str


@router.post("/search", response_model=DiscoverySearchResponse)
async def search_companies(
    data: SearchRequest,
    user: CurrentUser,
    session: DBSession,
):
    """Start a discovery search for companies."""
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant access required")
    use_cases = DiscoveryUseCases(session, user.tenant_id)
    request = DiscoverySearchRequest(
        location=data.location,
        radius_km=data.radius_km,
        intent=data.intent,
        max_results=data.max_results,
        sources=data.sources,
    )
    return await use_cases.search(request)


@router.post("/parse-intent", response_model=IntentParseResponse)
async def parse_intent(
    data: IntentParseRequest,
    user: CurrentUser,
    session: DBSession,
) -> dict[str, Any]:
    """Parse natural language intent into structured search rules (preview without executing)."""
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="User must belong to a tenant")
    use_cases = DiscoveryUseCases(session, user.tenant_id)
    return cast("dict[str, Any]", use_cases.parse_intent(data.intent))  # type: ignore[reportUnknownMemberType]


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_location(
    data: GeocodeRequest,
    user: CurrentUser,  # noqa: ARG001
):
    """Convert a location string to coordinates."""
    from src.infrastructure.scraping.geocoding import get_geocoding_service

    geocoding = get_geocoding_service()
    result = await geocoding.geocode(data.location)
    if not result:
        from src.core.exceptions import NotFoundError

        raise NotFoundError("Location", data.location)
    return GeocodeResponse(
        latitude=result.latitude,
        longitude=result.longitude,
        display_name=result.display_name,
        country=result.country,
        state=result.state,
        city=result.city,
    )


@router.get("/sources")
async def list_sources(user: CurrentUser):  # noqa: ARG001
    """List available scraper sources."""
    from src.infrastructure.scraping.plugins.registry import get_plugin_registry

    registry = get_plugin_registry()
    return {"sources": registry.list_plugins()}
