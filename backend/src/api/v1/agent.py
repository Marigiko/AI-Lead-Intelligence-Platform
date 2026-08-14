"""Agent API — autonomy settings, knowledge base, objection handling."""
from fastapi import APIRouter
from pydantic import BaseModel

from src.api.dependencies import CurrentUser
from src.infrastructure.agent.autonomy import (
    AutonomyLevel,
    get_knowledge_base,
    get_objection_handler,
)

router = APIRouter(prefix="/agent", tags=["Agent"])


class SetAutonomyRequest(BaseModel):
    level: int  # 1=review_all, 2=auto_except_objections, 3=full_autonomy


class AddKnowledgeRequest(BaseModel):
    content: str
    source: str = "manual"
    category: str = ""


class DetectObjectionRequest(BaseModel):
    message: str


@router.get("/autonomy")
async def get_autonomy(user: CurrentUser):
    """Get current autonomy level."""
    return {"level": 1, "label": "review_all"}


@router.put("/autonomy")
async def set_autonomy(data: SetAutonomyRequest, user: CurrentUser):
    """Set autonomy level for the agent."""
    try:
        level = AutonomyLevel(data.level)
    except ValueError:
        level = AutonomyLevel.REVIEW_ALL

    labels = {1: "review_all", 2: "auto_except_objections", 3: "full_autonomy"}
    return {"level": level.value, "label": labels.get(level.value, "unknown")}


@router.get("/knowledge")
async def get_knowledge(user: CurrentUser):
    """Get all knowledge base entries."""
    kb = get_knowledge_base()
    return {
        "entries": [
            {"id": e.id, "content": e.content, "source": e.source, "category": e.category, "is_active": e.is_active}
            for e in kb.entries
        ]
    }


@router.post("/knowledge")
async def add_knowledge(data: AddKnowledgeRequest, user: CurrentUser):
    """Add entry to knowledge base."""
    kb = get_knowledge_base()
    entry = kb.add_entry(data.content, data.source, data.category)
    return {"id": entry.id, "content": entry.content}


@router.delete("/knowledge/{entry_id}")
async def delete_knowledge(entry_id: str, user: CurrentUser):
    """Remove knowledge entry."""
    kb = get_knowledge_base()
    kb.entries = [e for e in kb.entries if e.id != entry_id]
    return {"removed": True}


@router.post("/detect-objection")
async def detect_objection(data: DetectObjectionRequest, user: CurrentUser):
    """Detect if a message contains a sales objection."""
    handler = get_objection_handler()
    result = handler.detect_objection(data.message)
    return {"objection": result, "has_objection": result is not None}
