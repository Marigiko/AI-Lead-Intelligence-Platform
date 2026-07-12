from __future__ import annotations

import asyncio
from typing import Any

import structlog

from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(name="src.workers.sdr_tasks.check_pending_conversations")  # type: ignore[reportUntypedFunctionDecorator]
def check_pending_conversations() -> None:
    """Check for pending conversation responses to handle."""
    import datetime
    from datetime import UTC

    from sqlalchemy import select

    async def _run() -> None:
        from src.core.database import get_session_factory
        from src.domain.conversation.models import Conversation, ConversationMessage

        factory = get_session_factory()
        async with factory() as session:
            cutoff = datetime.datetime.now(UTC) - datetime.timedelta(minutes=5)
            stmt = (
                select(Conversation)
                .where(
                    Conversation.status == "active",
                    Conversation.message_count > 0,
                    Conversation.escalated_at.is_(None),  # type: ignore[union-attr]
                    Conversation.updated_at < cutoff,  # type: ignore[union-attr]
                )
                .limit(50)
            )
            result = await session.execute(stmt)
            conversations = list(result.scalars().all())

            handled = 0
            for conv in conversations:
                msg_stmt = (
                    select(ConversationMessage)
                    .where(ConversationMessage.conversation_id == conv.id)
                    .order_by(ConversationMessage.created_at.desc())
                    .limit(1)
                )
                last_msg = (await session.execute(msg_stmt)).scalar_one_or_none()
                if last_msg and last_msg.role == "contact":
                    handled += 1

            logger.info(
                "checked_pending_conversations",
                total=len(conversations),
                pending_ai_reply=handled,
            )

    asyncio.run(_run())


@celery_app.task(name="src.workers.sdr_tasks.process_conversation_message")  # type: ignore[reportUntypedFunctionDecorator]
def process_conversation_message(
    conversation_id: str, message: str, role: str = "contact"
) -> dict[str, Any]:
    """Process a single conversation message and generate AI response."""
    logger.info("processing_message", conversation_id=conversation_id)

    async def _run():
        from uuid import UUID

        from src.application.sdr.use_cases import SDRUseCases
        from src.core.database import get_session_factory

        factory = get_session_factory()
        async with factory() as session:
            from src.infrastructure.database.repositories.conversation_repo import (
                SQLAlchemyConversationRepository,
            )

            conv_repo = SQLAlchemyConversationRepository(session)
            conv = await conv_repo.get_by_id(UUID(conversation_id))
            if not conv:
                return {"error": "Conversation not found"}

            use_cases = SDRUseCases(session, conv.tenant_id)
            return await use_cases.handle_incoming_message(UUID(conversation_id), message, role)

    return asyncio.run(_run())
