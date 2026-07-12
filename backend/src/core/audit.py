"""
Audit logging — tracks all important actions.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import structlog

from src.domain.audit.models import AuditLog

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


async def log_audit(
    session: AsyncSession,
    tenant_id: UUID | None,
    user_id: UUID | None,
    action: str,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    """Write an audit log entry."""
    entry = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
    )
    try:
        session.add(entry)
        await session.flush()
    except Exception as exc:
        logger.error("audit_log_failed", action=action, error=str(exc))
        await session.rollback()
