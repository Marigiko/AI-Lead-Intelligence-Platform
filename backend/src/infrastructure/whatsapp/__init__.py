"""
WhatsApp Business API sender infrastructure.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import structlog

from src.core.config import get_settings

logger = structlog.get_logger()


@dataclass
class WhatsAppMessage:
    to: str
    body: str
    media_url: str | None = None


class WhatsAppSender:
    """Send messages via WhatsApp Business Cloud API."""

    def __init__(self) -> None:
        settings = get_settings()
        self._token = settings.whatsapp_api_token
        self._phone_id = settings.whatsapp_phone_number_id
        self._base_url = f"https://graph.facebook.com/v18.0/{self._phone_id}"

    @property
    def is_configured(self) -> bool:
        return bool(self._token and self._phone_id)

    async def send(self, message: WhatsAppMessage) -> dict[str, Any]:
        """Send a WhatsApp message."""
        import httpx

        if not self.is_configured:
            logger.warning("whatsapp_not_configured")
            return {"error": "WhatsApp is not configured"}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._base_url}/messages",
                headers={"Authorization": f"Bearer {self._token}"},
                json={
                    "messaging_product": "whatsapp",
                    "to": message.to,
                    "type": "text",
                    "text": {"body": message.body},
                },
            )
            response.raise_for_status()
            return response.json()


def get_whatsapp_sender() -> WhatsAppSender:
    return WhatsAppSender()
