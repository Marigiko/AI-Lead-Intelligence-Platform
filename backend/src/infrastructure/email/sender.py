"""
Email sender — handles SMTP and SendGrid email delivery.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib
import structlog

from src.core.config import get_settings

logger = structlog.get_logger()


@dataclass
class EmailMessage:
    to: str
    subject: str
    html_body: str
    text_body: str = ""
    from_email: str = ""
    from_name: str = ""
    reply_to: str = ""
    tracking_id: str = ""
    campaign_lead_id: str = ""


@dataclass
class SendResult:
    success: bool
    message_id: str = ""
    error: str = ""
    sent_at: datetime | None = None


class EmailSender:
    """Sends emails via SMTP or SendGrid."""

    async def send(self, message: EmailMessage) -> SendResult:
        settings = get_settings()

        # Use SendGrid if configured
        if settings.sendgrid_api_key:
            return await self._send_sendgrid(message, settings.sendgrid_api_key)

        # Fallback to SMTP
        if settings.smtp_host:
            return await self._send_smtp(message, settings)

        logger.warning("no_email_provider_configured")
        return SendResult(success=False, error="No email provider configured")

    async def _send_smtp(self, message: EmailMessage, settings: any) -> SendResult:
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = f"{message.from_name or settings.app_name} <{message.from_email or settings.smtp_user}>"
            msg["To"] = message.to
            msg["Subject"] = message.subject
            if message.reply_to:
                msg["Reply-To"] = message.reply_to

            # Add tracking pixel
            if message.tracking_id:
                tracking_url = f"{settings.api_url}/api/v1/campaigns/track/open/{message.tracking_id}"
                message.html_body += f'<img src="{tracking_url}" width="1" height="1" style="display:none" />'

            # Add unsubscribe link
            if message.campaign_lead_id:
                unsub_url = f"{settings.app_url}/unsubscribe/{message.campaign_lead_id}"
                message.html_body += f'<br><br><p style="font-size:11px;color:#999"><a href="{unsub_url}">Cancelar suscripcion</a></p>'

            if message.text_body:
                msg.attach(MIMEText(message.text_body, "plain"))
            msg.attach(MIMEText(message.html_body, "html"))

            await aiosmtplib.send(
                msg,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_user,
                password=settings.smtp_password,
                use_tls=True,
            )

            return SendResult(
                success=True,
                message_id=str(uuid.uuid4()),
                sent_at=datetime.now(timezone.utc),
            )
        except Exception as e:
            logger.error("smtp_send_failed", to=message.to, error=str(e))
            return SendResult(success=False, error=str(e)[:200])

    async def _send_sendgrid(self, message: EmailMessage, api_key: str) -> SendResult:
        try:
            import httpx

            payload = {
                "personalizations": [{"to": [{"email": message.to}]}],
                "from": {
                    "email": message.from_email or "noreply@example.com",
                    "name": message.from_name or "Lead Intelligence",
                },
                "subject": message.subject,
                "content": [{"type": "text/html", "value": message.html_body}],
            }

            # Add tracking
            if message.tracking_id:
                settings = get_settings()
                tracking_url = f"{settings.api_url}/api/v1/campaigns/track/open/{message.tracking_id}"
                payload["custom_args"] = {"tracking_id": message.tracking_id}
                payload["tracking_settings"] = {
                    "open_tracking": {"enable": True},
                    "click_tracking": {"enable": True},
                }

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                )

            if resp.status_code in (200, 202):
                return SendResult(
                    success=True,
                    message_id=resp.headers.get("x-message-id", ""),
                    sent_at=datetime.now(timezone.utc),
                )
            else:
                return SendResult(success=False, error=f"SendGrid {resp.status_code}: {resp.text[:200]}")

        except Exception as e:
            logger.error("sendgrid_send_failed", to=message.to, error=str(e))
            return SendResult(success=False, error=str(e)[:200])


# Singleton
_sender: EmailSender | None = None


def get_email_sender() -> EmailSender:
    global _sender
    if _sender is None:
        _sender = EmailSender()
    return _sender
