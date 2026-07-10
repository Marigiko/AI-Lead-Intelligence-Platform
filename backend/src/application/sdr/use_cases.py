"""
SDR application use cases.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

import structlog

from src.domain.conversation.models import Conversation, ConversationMessage
from src.infrastructure.ai.agents.sdr_agent import (
    ConversationState,
    SDRAgent,
    get_sdr_agent,
)
from src.infrastructure.database.repositories.company_repo import SQLAlchemyCompanyRepository
from src.infrastructure.database.repositories.conversation_repo import (
    SQLAlchemyConversationMessageRepository,
    SQLAlchemyConversationRepository,
)

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

    from src.domain.company.repository import CompanyRepository
    from src.domain.conversation.repository import (
        ConversationMessageRepository,
        ConversationRepository,
    )

logger = structlog.get_logger()


class SDRUseCases:
    def __init__(self, session: AsyncSession, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id
        self._conv_repo: ConversationRepository = SQLAlchemyConversationRepository(session)
        self._msg_repo: ConversationMessageRepository = SQLAlchemyConversationMessageRepository(
            session
        )
        self._company_repo: CompanyRepository = SQLAlchemyCompanyRepository(session)
        self._agent: SDRAgent = get_sdr_agent()

    async def handle_incoming_message(
        self,
        conversation_id: UUID,
        message: str,
        role: str = "contact",
    ) -> dict[str, Any]:
        """Process an incoming message and generate AI response."""
        conv = await self._conv_repo.get_by_id(conversation_id)
        if not conv or conv.tenant_id != self._tenant_id:
            return {"error": "Conversation not found"}

        # Save incoming message
        incoming = ConversationMessage(
            conversation_id=conversation_id,
            role=role,
            content=message,
            channel=conv.channel,
        )
        await self._msg_repo.create(incoming)

        # Get conversation history
        history = await self._msg_repo.list_by_conversation(conversation_id, limit=20)
        history_dicts = [{"role": m.role, "content": m.content} for m in history]

        # Get company context
        company_context: dict[str, Any] = {}
        if conv.company_id:
            company = await self._company_repo.get_by_id(conv.company_id)
            if company:
                company_context = {
                    "name": company.name,
                    "industry": company.industry,
                    "opportunity_score": company.opportunity_score,
                    "recommended_services": company.recommended_services or [],
                }

        # Determine current state
        current_state: ConversationState = ConversationState.NEW
        try:
            current_state = ConversationState(conv.status)
        except ValueError:
            current_state = ConversationState.NEW

        # Get AI response
        agent_response = await self._agent.handle_incoming_message(
            message=message,
            conversation_history=history_dicts,
            company_context=company_context,
            current_state=current_state,
        )

        # Save AI response
        ai_msg = ConversationMessage(
            conversation_id=conversation_id,
            role="ai",
            content=agent_response.reply,
            channel=conv.channel,
            intent_detected=agent_response.intent.value,
            sentiment=agent_response.sentiment,
        )
        await self._msg_repo.create(ai_msg)

        # Update conversation state
        conv.status = agent_response.state.value
        conv.intent = agent_response.intent.value
        conv.sentiment = agent_response.sentiment
        conv.next_action = agent_response.next_action
        conv.message_count = len(history) + 2
        conv.summary = await self._generate_summary(history_dicts, message, agent_response.reply)

        if agent_response.meeting_time:
            conv.scheduled_meeting_at = datetime.now(UTC)  # Simplified
            conv.next_action = f"Meeting proposed: {agent_response.meeting_time}"

        if agent_response.should_escalate:
            conv.escalated_at = datetime.now(UTC)

        await self._conv_repo.update(conv)
        await self._session.commit()

        return {
            "conversation_id": str(conversation_id),
            "reply": agent_response.reply,
            "intent": agent_response.intent.value,
            "sentiment": agent_response.sentiment,
            "state": agent_response.state.value,
            "next_action": agent_response.next_action,
            "should_escalate": agent_response.should_escalate,
        }

    async def create_conversation(
        self,
        company_id: UUID,
        channel: str = "email",
        campaign_id: UUID | None = None,
        contact_id: UUID | None = None,
    ) -> dict[str, Any]:
        """Create a new conversation."""
        conv = Conversation(
            tenant_id=self._tenant_id,
            company_id=company_id,
            campaign_id=campaign_id,
            contact_id=contact_id,
            channel=channel,
            status=ConversationState.NEW.value,
        )
        conv = await self._conv_repo.create(conv)
        await self._session.commit()

        return {
            "conversation_id": str(conv.id),
            "status": conv.status,
            "channel": conv.channel,
        }

    async def list_conversations(
        self, status: str | None = None, offset: int = 0, limit: int = 20
    ) -> tuple[list[dict[str, Any]], int]:
        """List conversations for the tenant."""
        convs, total = await self._conv_repo.list_by_tenant(
            self._tenant_id, status=status, offset=offset, limit=limit
        )
        items: list[dict[str, Any]] = []
        for c in convs:
            items.append(
                {
                    "id": str(c.id),
                    "channel": c.channel,
                    "status": c.status,
                    "summary": c.summary,
                    "sentiment": c.sentiment,
                    "intent": c.intent,
                    "next_action": c.next_action,
                    "message_count": c.message_count,
                    "created_at": str(c.created_at),
                    "updated_at": str(c.updated_at),
                }
            )
        return items, total

    async def get_conversation_messages(self, conversation_id: UUID) -> list[dict[str, Any]]:
        """Get all messages in a conversation."""
        conv = await self._conv_repo.get_by_id(conversation_id)
        if not conv or conv.tenant_id != self._tenant_id:
            return []

        messages = await self._msg_repo.list_by_conversation(conversation_id, limit=100)
        return [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "channel": m.channel,
                "intent_detected": m.intent_detected,
                "sentiment": m.sentiment,
                "created_at": str(m.created_at),
            }
            for m in messages
        ]

    async def human_intervention(self, conversation_id: UUID, message: str) -> dict[str, Any]:
        """Human takes over the conversation."""
        return await self.handle_incoming_message(conversation_id, message, role="human")

    async def _generate_summary(
        self,
        history: list[dict[str, Any]],
        new_message: str,
        reply: str,
    ) -> str:
        """Generate a brief conversation summary from context."""
        parts: list[str] = []

        if history:
            last_exchange = history[-1]
            role = last_exchange.get("role", "contact")
            content = last_exchange.get("content", "")[:80]
            parts.append(f"{'Contacto' if role == 'contact' else 'AI'}: {content}")

        if new_message:
            parts.append(f"Mensaje: {new_message[:80]}")

        if reply:
            intent = self._detect_intent_from_reply(reply)
            parts.append(f"Respuesta AI: {intent}")

        return " | ".join(parts) if parts else "Conversación iniciada"

    @staticmethod
    def _detect_intent_from_reply(reply: str) -> str:
        """Extract high-level intent from the AI reply for summary purposes."""
        reply_lower = reply.lower()
        if "reunión" in reply_lower or "meeting" in reply_lower:
            return "propuso reunión"
        if "precio" in reply_lower or "costo" in reply_lower:
            return "consultó precio"
        if "interesado" in reply_lower or "interés" in reply_lower:
            return "mostró interés"
        if "no " in reply_lower:
            return "sin interés"
        return "respondió consulta"
