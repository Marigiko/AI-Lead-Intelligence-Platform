from __future__ import annotations

import asyncio
from typing import Any

import structlog

from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(name="src.workers.sdr_tasks.check_pending_conversations")  # type: ignore[reportUntypedFunctionDecorator]
def check_pending_conversations() -> None:
    """Check for pending conversation responses to handle."""
    logger.info("checking_pending_conversations")

    async def _run():
        from src.core.database import get_session_factory

        factory = get_session_factory()
        async with factory():
            # In production, this would check for messages needing AI responses
            # For now, it's a placeholder for the background check loop
            pass

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
