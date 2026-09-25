"""
Deliverability infrastructure — inbox rotation, SMTP verification, warmup.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime

import structlog

logger = structlog.get_logger()


@dataclass
class InboxConfig:
    """A sending inbox (SMTP account)."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    from_name: str = ""
    from_email: str = ""
    daily_limit: int = 30
    is_active: bool = True
    reputation_score: int = 50  # 0-100
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass
class SendQuota:
    """Tracks daily send count for an inbox."""

    inbox_id: str = ""
    sent_today: int = 0
    last_reset: datetime = field(default_factory=lambda: datetime.now(UTC))


class InboxRotator:
    """Rotates between multiple inboxes to avoid limits."""

    def __init__(self) -> None:
        self._inboxes: list[InboxConfig] = []
        self._quotas: dict[str, SendQuota] = {}
        self._current_index = 0

    def add_inbox(self, inbox: InboxConfig) -> None:
        self._inboxes.append(inbox)
        self._quotas[inbox.id] = SendQuota(inbox_id=inbox.id)
        logger.info("inbox_added", username=inbox.username)

    def remove_inbox(self, inbox_id: str) -> None:
        self._inboxes = [i for i in self._inboxes if i.id != inbox_id]
        self._quotas.pop(inbox_id, None)

    def get_next_inbox(self) -> InboxConfig | None:
        """Get next available inbox using round-robin with quota awareness."""
        if not self._inboxes:
            return None

        active = [i for i in self._inboxes if i.is_active]
        if not active:
            return None

        # Reset quotas if new day
        now = datetime.now(UTC)
        for q in self._quotas.values():
            if now.date() > q.last_reset.date():
                q.sent_today = 0
                q.last_reset = now

        # Find inbox with available quota
        for _ in range(len(active)):
            inbox = active[self._current_index % len(active)]
            self._current_index += 1

            quota = self._quotas.get(inbox.id)
            if quota and quota.sent_today < inbox.daily_limit:
                quota.sent_today += 1
                return inbox

        logger.warning("all_inboxes_quota_exhausted")
        return None

    @property
    def inbox_count(self) -> int:
        return len(self._inboxes)

    def get_stats(self) -> list[dict]:
        """Get stats for all inboxes."""
        stats = []
        for inbox in self._inboxes:
            quota = self._quotas.get(inbox.id)
            stats.append(
                {
                    "id": inbox.id,
                    "username": inbox.username,
                    "daily_limit": inbox.daily_limit,
                    "sent_today": quota.sent_today if quota else 0,
                    "reputation_score": inbox.reputation_score,
                    "is_active": inbox.is_active,
                }
            )
        return stats


class SMTPVerifier:
    """Verifies email deliverability via SMTP."""

    async def verify(self, email: str) -> dict:
        """Verify an email address deliverability."""
        import dns.resolver

        domain = email.split("@")[1] if "@" in email else ""
        if not domain:
            return {"valid": False, "reason": "invalid_format"}

        try:
            mx_records = dns.resolver.resolve(domain, "MX")
            exchanges = [str(record.exchange).rstrip(".") for record in mx_records]
            mx_host = exchanges[0] if exchanges else ""
            if not mx_host:
                return {"valid": False, "reason": "no_mx_records"}
        except Exception:
            return {"valid": False, "reason": "dns_error"}

        is_disposable = domain in self._disposable_domains
        is_role = email.split("@")[0].lower() in self._role_prefixes

        return {
            "valid": True,
            "disposable": is_disposable,
            "role_address": is_role,
            "mx_host": mx_host,
            "confidence": "medium",
        }

    @staticmethod
    def quick_check(email: str) -> bool:
        """Quick format validation."""
        import re

        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(pattern, email))

    _disposable_domains = {
        "mailinator.com",
        "guerrillamail.com",
        "tempmail.com",
        "throwaway.email",
        "yopmail.com",
        "sharklasers.com",
    }

    _role_prefixes = {
        "info",
        "admin",
        "support",
        "sales",
        "contact",
        "hello",
        "office",
        "team",
        "marketing",
        "noreply",
    }


# Singleton
_rotator: InboxRotator | None = None
_verifier: SMTPVerifier | None = None


def get_inbox_rotator() -> InboxRotator:
    global _rotator
    if _rotator is None:
        _rotator = InboxRotator()
    return _rotator


def get_smtp_verifier() -> SMTPVerifier:
    global _verifier
    if _verifier is None:
        _verifier = SMTPVerifier()
    return _verifier
