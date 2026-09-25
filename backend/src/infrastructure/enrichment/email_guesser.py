"""
Email guesser — generates likely email patterns and verifies via SMTP.
For companies where scraping didn't find emails.
"""

from __future__ import annotations

import asyncio
import smtplib
from dataclasses import dataclass

import dns.resolver
import structlog

logger = structlog.get_logger()

COMMON_PREFIXES = [
    "info",
    "contacto",
    "hola",
    "ventas",
    "admin",
    "soporte",
    "ayuda",
    "comercial",
    "marketing",
    "oficina",
    "gerencia",
    "rrhh",
    "consultas",
]


@dataclass
class GuessedEmail:
    email: str
    confidence: float
    source: str  # "pattern_guess"
    verified: bool = False


class EmailGuesser:
    """Generates and verifies likely email addresses for a domain."""

    def __init__(self, verify_smtp: bool = False, smtp_timeout: float = 5.0) -> None:
        self._verify_smtp = verify_smtp
        self._smtp_timeout = smtp_timeout

    async def guess_emails(self, domain: str) -> list[GuessedEmail]:
        """Generate likely email addresses for a domain."""
        if not domain:
            return []

        candidates: list[GuessedEmail] = []

        for prefix in COMMON_PREFIXES:
            email = f"{prefix}@{domain}".lower()
            candidates.append(
                GuessedEmail(
                    email=email,
                    confidence=0.4,
                    source="pattern_guess",
                    verified=False,
                )
            )

        # Verify via SMTP if enabled
        if self._verify_smtp:
            return await self._batch_verify(candidates)

        return candidates

    async def _batch_verify(self, candidates: list[GuessedEmail]) -> list[GuessedEmail]:
        """Verify multiple email candidates via SMTP."""
        tasks = [self._verify_email(c.email) for c in candidates]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        verified: list[GuessedEmail] = []
        for candidate, result in zip(candidates, results, strict=True):
            if isinstance(result, Exception):
                continue
            if result:
                candidate.verified = True
                candidate.confidence = 0.7
                verified.append(candidate)

        return verified

    async def _verify_email(self, email: str) -> bool:
        """Verify an email address via SMTP without sending."""
        domain = email.split("@")[1] if "@" in email else ""
        if not domain:
            return False

        try:
            # Get MX records
            mx_records = dns.resolver.resolve(domain, "MX")
            exchanges = [str(record.exchange).rstrip(".") for record in mx_records]
            mx_host = exchanges[0] if exchanges else ""

            if not mx_host:
                return False

            # Try SMTP connection
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._smtp_check, mx_host, email)
        except Exception:
            return False

    def _smtp_check(self, mx_host: str, email: str) -> bool:
        """Synchronous SMTP verification."""
        try:
            with smtplib.SMTP(mx_host, 25, timeout=self._smtp_timeout) as server:
                server.ehlo()
                server.mail("verify@aileadplatform.com")
                code, _ = server.rcpt(email)
                return code == 250
        except (TimeoutError, smtplib.SMTPException, OSError):
            return False


async def get_email_guesser(verify_smtp: bool = False) -> EmailGuesser:
    """Factory function for EmailGuesser."""
    return EmailGuesser(verify_smtp=verify_smtp)
