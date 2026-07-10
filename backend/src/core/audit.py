"""
Audit logging — tracks all important actions.
"""

from __future__ import annotations

from typing import Any

import structlog

from src.domain.audit.models import AuditLog

logger = structlog.get_logger()


async def log_audit(
    session,
    tenant_id,
    user_id: str | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    """Write an audit log entry."""
    from uuid import UUID

    entry = AuditLog(
        tenant_id=UUID(tenant_id) if tenant_id else None,
        user_id=UUID(user_id) if user_id else None,
        action=action,
        entity_type=entity_type,
        entity_id=UUID(entity_id) if entity_id else None,
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
