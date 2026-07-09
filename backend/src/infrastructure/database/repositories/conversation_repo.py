from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.conversation.models import Conversation, ConversationMessage
from src.domain.conversation.repository import (
    ConversationMessageRepository,
    ConversationRepository,
)


class SQLAlchemyConversationRepository(ConversationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, conversation_id: UUID) -> Conversation | None:
        return await self._session.get(Conversation, conversation_id)

    async def create(self, conversation: Conversation) -> Conversation:
        self._session.add(conversation)
        await self._session.flush()
        await self._session.refresh(conversation)
        return conversation

    async def update(self, conversation: Conversation) -> Conversation:
        await self._session.flush()
        await self._session.refresh(conversation)
        return conversation

    async def list_by_tenant(
        self, tenant_id: UUID, *, status: str | None = None, offset: int = 0, limit: int = 20
    ) -> tuple[list[Conversation], int]:
        base = select(Conversation).where(Conversation.tenant_id == tenant_id)
        if status:
            base = base.where(Conversation.status == status)
        count = (await self._session.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
        stmt = base.order_by(Conversation.updated_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), count

    async def get_pending_conversations(self, tenant_id: UUID) -> list[Conversation]:
        stmt = (
            select(Conversation)
            .where(
                Conversation.tenant_id == tenant_id,
                Conversation.status == "active",
            )
            .order_by(Conversation.updated_at)
            .limit(50)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class SQLAlchemyConversationMessageRepository(ConversationMessageRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, message: ConversationMessage) -> ConversationMessage:
        self._session.add(message)
        await self._session.flush()
        await self._session.refresh(message)
        return message

    async def list_by_conversation(
        self, conversation_id: UUID, *, limit: int = 50
    ) -> list[ConversationMessage]:
        stmt = (
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.created_at)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_last_message(self, conversation_id: UUID) -> ConversationMessage | None:
        stmt = (
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.created_at.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()
