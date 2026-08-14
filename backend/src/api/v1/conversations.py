import contextlib
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from src.api.dependencies import CurrentUser, DBSession
from src.application.sdr.use_cases import SDRUseCases
from src.core.security import TokenPayload

router = APIRouter(prefix="/conversations", tags=["Conversations"])


# --- DTOs ---


class CreateConversationRequest(BaseModel):
    company_id: UUID
    channel: str = Field(default="email", pattern="^(email|whatsapp|linkedin)$")
    campaign_id: UUID | None = None
    contact_id: UUID | None = None


class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1)
    role: str = Field(default="contact", pattern="^(contact|human)$")


class ConversationResponse(BaseModel):
    id: str
    channel: str
    status: str
    summary: str | None
    sentiment: str | None
    intent: str | None
    next_action: str | None
    message_count: int
    created_at: str
    updated_at: str


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    channel: str | None
    intent_detected: str | None
    sentiment: str | None
    created_at: str


class ConversationListResponse(BaseModel):
    items: list[ConversationResponse]
    total: int


class HandleMessageResponse(BaseModel):
    conversation_id: str
    reply: str
    intent: str
    sentiment: str
    state: str
    next_action: str
    should_escalate: bool


# --- Routes ---


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    user: CurrentUser,
    session: DBSession,
    status: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> ConversationListResponse:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = SDRUseCases(session, user.tenant_id)
    items, total = await use_cases.list_conversations(status=status, offset=offset, limit=limit)
    return ConversationListResponse(
        items=[ConversationResponse(**i) for i in items],
        total=total,
    )


@router.post("", response_model=dict)
async def create_conversation(
    data: CreateConversationRequest,
    user: CurrentUser,
    session: DBSession,
) -> dict[str, Any]:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = SDRUseCases(session, user.tenant_id)
    return await use_cases.create_conversation(
        company_id=data.company_id,
        channel=data.channel,
        campaign_id=data.campaign_id,
        contact_id=data.contact_id,
    )


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: UUID,
    user: CurrentUser,
    session: DBSession,
) -> list[MessageResponse]:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = SDRUseCases(session, user.tenant_id)
    messages = await use_cases.get_conversation_messages(conversation_id)
    return [MessageResponse(**m) for m in messages]


@router.post("/{conversation_id}/messages", response_model=HandleMessageResponse)
async def send_message(
    conversation_id: UUID,
    data: SendMessageRequest,
    user: CurrentUser,
    session: DBSession,
) -> HandleMessageResponse:
    """Send a message and get AI response."""
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = SDRUseCases(session, user.tenant_id)
    result = await use_cases.handle_incoming_message(
        conversation_id=conversation_id,
        message=data.message,
        role=data.role,
    )
    return HandleMessageResponse(**result)


@router.post("/{conversation_id}/human")
async def human_takeover(
    conversation_id: UUID,
    data: SendMessageRequest,
    user: CurrentUser,
    session: DBSession,
) -> dict[str, Any]:
    """Human takes over the conversation."""
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="User has no tenant")
    use_cases = SDRUseCases(session, user.tenant_id)
    return await use_cases.human_intervention(conversation_id, data.message)


# --- WebSocket for real-time updates ---


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, conversation_id: str):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, websocket: WebSocket, conversation_id: str):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].remove(websocket)

    async def broadcast(self, conversation_id: str, message: dict[str, Any]):
        if conversation_id in self.active_connections:
            for connection in self.active_connections[conversation_id]:
                with contextlib.suppress(Exception):
                    await connection.send_json(message)


manager = ConnectionManager()


async def _ws_get_token(websocket: WebSocket) -> TokenPayload:
    from src.core.security import decode_token

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        raise WebSocketDisconnect(code=4001)  # type: ignore[misc]
    payload = decode_token(token)
    if not payload or payload.type.value != "access":
        await websocket.close(code=4001, reason="Invalid token")
        raise WebSocketDisconnect(code=4001)  # type: ignore[misc]
    return payload


@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    try:
        await _ws_get_token(websocket)
    except WebSocketDisconnect:
        return

    # ConnectionManager.connect() already calls websocket.accept() internally.
    await manager.connect(websocket, conversation_id)
    try:
        while True:
            data = await websocket.receive_json()
            await websocket.send_json({"type": "ack", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket, conversation_id)
