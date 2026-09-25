"""CRM API — pipeline stages and deal management."""

from fastapi import APIRouter
from pydantic import BaseModel

from src.api.dependencies import CurrentUser, DBSession

router = APIRouter(prefix="/crm", tags=["CRM"])


class StageResponse(BaseModel):
    id: str
    name: str
    color: str | None
    position: int


# Default pipeline stages
DEFAULT_STAGES = [
    {"id": "prospeccion", "name": "Prospeccion", "color": "#94a3b8", "position": 0},
    {"id": "contacto", "name": "Contacto", "color": "#60a5fa", "position": 1},
    {"id": "calificado", "name": "Calificado", "color": "#a78bfa", "position": 2},
    {"id": "propuesta", "name": "Propuesta", "color": "#fbbf24", "position": 3},
    {"id": "negociacion", "name": "Negociacion", "color": "#f97316", "position": 4},
    {"id": "ganado", "name": "Ganado", "color": "#22c55e", "position": 5},
    {"id": "perdido", "name": "Perdido", "color": "#ef4444", "position": 6},
]


@router.get("/stages", response_model=list[StageResponse])
async def get_stages(user: CurrentUser, session: DBSession):
    """Get pipeline stages for the tenant."""
    # For now, return default stages. In future, could be customized per tenant.
    return [StageResponse(**stage) for stage in DEFAULT_STAGES]
