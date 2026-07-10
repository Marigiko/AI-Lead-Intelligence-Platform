from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from uuid import UUID

    from src.domain.conversation.models import Conversation, ConversationMessage


class ConversationRepository(ABC):
    @abstractmethod
    async def get_by_id(self, conversation_id: UUID) -> Conversation | None: ...

    @abstractmethod
    async def create(self, conversation: Conversation) -> Conversation: ...

    @abstractmethod
    async def update(self, conversation: Conversation) -> Conversation: ...

    @abstractmethod
    async def list_by_tenant(
        self, tenant_id: UUID, *, status: str | None = None, offset: int = 0, limit: int = 20
    ) -> tuple[list[Conversation], int]: ...

    @abstractmethod
    async def get_pending_conversations(self, tenant_id: UUID) -> list[Conversation]: ...


class ConversationMessageRepository(ABC):
    @abstractmethod
    async def create(self, message: ConversationMessage) -> ConversationMessage: ...

    @abstractmethod
    async def list_by_conversation(
        self, conversation_id: UUID, *, limit: int = 50
    ) -> list[ConversationMessage]: ...

    @abstractmethod
    async def get_last_message(self, conversation_id: UUID) -> ConversationMessage | None: ...
