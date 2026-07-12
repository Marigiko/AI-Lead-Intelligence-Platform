"""
Inbound webhook handlers for email replies and WhatsApp messages.
"""

from __future__ import annotations

from typing import Any

import structlog

logger = structlog.get_logger()


class WebhookHandler:
    """Process inbound webhook events from email/WhatsApp providers."""

    async def handle_email_reply(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Process an inbound email reply webhook event."""
        from src.core.database import get_session_factory

        message_id = payload.get("MessageID") or payload.get("message_id")
        from_email = payload.get("From") or payload.get("from")
        _ = payload.get("TextBody") or payload.get("text", "")

        logger.info("email_webhook_received", message_id=message_id, from_email=from_email)

        factory = get_session_factory()
        async with factory() as session:
            # Find campaign lead by email thread and create conversation
            logger.info("email_webhook_processed", from_email=from_email)
            await session.commit()

        return {"status": "processed", "from": from_email}

    async def handle_whatsapp_message(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Process an inbound WhatsApp message webhook event."""
        phone_number = payload.get("from", "")
        _ = payload.get("text", {}).get("body", "")

        logger.info("whatsapp_webhook_received", from_number=phone_number)

        return {"status": "processed", "from": phone_number}


def get_webhook_handler() -> WebhookHandler:
    return WebhookHandler()
