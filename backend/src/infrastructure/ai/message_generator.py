"""
AI Message Generator — generates personalized outreach messages using AI.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import structlog

from src.infrastructure.ai.gateway import get_ai_gateway

logger = structlog.get_logger()


@dataclass
class GeneratedMessage:
    subject: str
    body: str
    channel: str  # email, whatsapp, linkedin
    personalization_notes: str = ""


class MessageGenerator:
    """Generates personalized outreach messages using AI."""

    def __init__(self) -> None:
        self._ai = get_ai_gateway()

    async def generate_email(
        self,
        company_data: dict[str, Any],
        opportunity_data: dict[str, Any],
        sender_info: dict[str, str],
        tone: str = "professional",
        language: str = "es",
    ) -> GeneratedMessage:
        """Generate a personalized cold email."""
        company_name = company_data.get("name", "su empresa")
        industry = company_data.get("industry", "")
        city = company_data.get("city", "")
        issues = opportunity_data.get("analysis", "")[:500]
        services = ", ".join(opportunity_data.get("recommended_services", [])[:3])
        score = opportunity_data.get("opportunity_score", 0)

        sender_name = sender_info.get("name", "Nuestro equipo")
        sender_company = sender_info.get("company", "Nuestra agencia")
        sender_services = sender_info.get("services", "servicios digitales")

        messages = [
            {
                "role": "system",
                "content": (
                    f"You are a B2B sales expert writing a {tone} cold email in {language}. "
                    "Rules:\n"
                    "- Keep it under 150 words\n"
                    "- Personalize with company name and industry\n"
                    "- Mention 1-2 specific problems you can solve\n"
                    "- Include a clear call-to-action\n"
                    "- Do NOT be pushy or aggressive\n"
                    "- Do NOT use ALL CAPS or excessive exclamation marks\n"
                    "- Sound human, not robotic\n"
                    "- Return JSON with: subject, body"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Write a cold email to {company_name} ({industry}, {city}).\n\n"
                    f"Problems found: {issues}\n"
                    f"Services we offer: {services}\n"
                    f"Sender: {sender_name} from {sender_company}\n"
                    f"Our specialty: {sender_services}\n\n"
                    "Generate a personalized email with subject and body."
                ),
            },
        ]

        response = await self._ai.complete(
            messages,
            temperature=0.7,
            response_format="json",
        )

        import json
        try:
            data = json.loads(response.content)
            return GeneratedMessage(
                subject=data.get("subject", ""),
                body=data.get("body", ""),
                channel="email",
                personalization_notes=f"Score: {score}, Services: {services}",
            )
        except json.JSONDecodeError:
            return GeneratedMessage(
                subject=f"Oportunidad para {company_name}",
                body=response.content,
                channel="email",
            )

    async def generate_whatsapp(
        self,
        company_data: dict[str, Any],
        opportunity_data: dict[str, Any],
        sender_info: dict[str, str],
    ) -> GeneratedMessage:
        """Generate a personalized WhatsApp message (shorter, more casual)."""
        company_name = company_data.get("name", "su empresa")
        services = ", ".join(opportunity_data.get("recommended_services", [])[:2])

        messages = [
            {
                "role": "system",
                "content": (
                    "Write a short, friendly WhatsApp message in Spanish for B2B outreach. "
                    "Rules:\n"
                    "- Under 50 words\n"
                    "- Friendly but professional\n"
                    "- Mention the company name\n"
                    "- One clear CTA\n"
                    "- Return JSON with: body"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"WhatsApp message for {company_name}.\n"
                    f"Services: {services}\n"
                    f"Sender: {sender_info.get('name', '')} de {sender_info.get('company', '')}"
                ),
            },
        ]

        response = await self._ai.complete(messages, temperature=0.7, response_format="json")

        import json
        try:
            data = json.loads(response.content)
            return GeneratedMessage(
                subject="",
                body=data.get("body", response.content),
                channel="whatsapp",
            )
        except json.JSONDecodeError:
            return GeneratedMessage(subject="", body=response.content, channel="whatsapp")

    async def generate_followup(
        self,
        company_data: dict[str, Any],
        original_message: str,
        days_since: int,
    ) -> GeneratedMessage:
        """Generate a follow-up message."""
        company_name = company_data.get("name", "su empresa")

        messages = [
            {
                "role": "system",
                "content": (
                    "Write a short follow-up email in Spanish. "
                    "It has been {days} days since the first contact. "
                    "Be polite, reference the previous message briefly, "
                    "and offer value. Under 100 words. "
                    "Return JSON with: subject, body"
                ).format(days=days_since),
            },
            {
                "role": "user",
                "content": (
                    f"Follow up with {company_name}.\n"
                    f"Original message: {original_message[:300]}"
                ),
            },
        ]

        response = await self._ai.complete(messages, temperature=0.7, response_format="json")

        import json
        try:
            data = json.loads(response.content)
            return GeneratedMessage(
                subject=data.get("subject", ""),
                body=data.get("body", ""),
                channel="email",
            )
        except json.JSONDecodeError:
            return GeneratedMessage(
                subject=f"Seguimiento - {company_name}",
                body=response.content,
                channel="email",
            )


# Singleton
_generator: MessageGenerator | None = None


def get_message_generator() -> MessageGenerator:
    global _generator
    if _generator is None:
        _generator = MessageGenerator()
    return _generator
