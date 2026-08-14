"""
Revenue Agent API — conversational AI endpoint.

Provides a chat interface to the AI Revenue Agent that understands
natural language and executes lead intelligence actions.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
import structlog

from src.api.dependencies import get_current_user
from src.domain.user.models import User
from src.infrastructure.ai.revenue_agent import get_revenue_agent

logger = structlog.get_logger()

router = APIRouter(prefix="/revenue-agent", tags=["Revenue Agent"])


class ChatRequest(BaseModel):
    """Request to chat with the Revenue Agent."""

    message: str = Field(..., min_length=1, max_length=2000, description="User's natural language message")
    conversation_id: str | None = Field(None, description="Conversation ID for context continuity")


class ChatResponse(BaseModel):
    """Response from the Revenue Agent."""

    message: str
    intent: str
    data: dict[str, Any] | None = None
    suggestions: list[str] = []
    actions_taken: list[str] = []
    conversation_id: str | None = None


class ConversationHistory(BaseModel):
    """Stored conversation history (in-memory for now)."""

    messages: list[dict[str, str]] = []


# In-memory conversation store (replace with Redis/DB in production)
_conversations: dict[str, ConversationHistory] = {}


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    """
    Send a message to the Revenue Agent.

    The agent understands natural language and can:
    - Search for companies by location/industry
    - Enrich company data
    - Score opportunities
    - Analyze pipeline
    - Check campaign status
    - Provide company information
    """
    agent = get_revenue_agent()

    # Get or create conversation history
    conv_id = request.conversation_id or f"conv_{current_user.id}"
    conversation = _conversations.setdefault(conv_id, ConversationHistory())

    try:
        # Process message
        response = await agent.process_message(
            message=request.message,
            conversation_history=conversation.messages,
            tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
        )

        # Store messages in conversation history
        conversation.messages.append({"role": "user", "content": request.message})
        conversation.messages.append({"role": "assistant", "content": response.message})

        # Limit history to last 20 messages
        if len(conversation.messages) > 20:
            conversation.messages = conversation.messages[-20:]

        return ChatResponse(
            message=response.message,
            intent=response.intent.value,
            data=response.data,
            suggestions=response.suggestions,
            actions_taken=response.actions_taken,
            conversation_id=conv_id,
        )

    except Exception as e:
        logger.error("revenue_agent_error", error=str(e), user_id=str(current_user.id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing message: {str(e)}",
        )


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Get conversation history."""
    conversation = _conversations.get(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "conversation_id": conversation_id,
        "messages": conversation.messages,
        "message_count": len(conversation.messages),
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Delete a conversation."""
    if conversation_id in _conversations:
        del _conversations[conversation_id]
    return {"status": "deleted"}


@router.get("/suggestions")
async def get_suggestions(
    current_user: User = Depends(get_current_user),
) -> dict[str, list[str]]:
    """Get suggested queries to help users get started."""
    return {
        "suggestions": [
            "Buscar empresas potenciales en mi zona",
            "Analiza acme.com",
            "Cómo va mi pipeline",
            "Estado de mis campañas",
            "Qué puedes hacer",
        ],
    }
