"""
Audit logging — tracks all important actions.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import structlog

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


async def log_audit(
    session: AsyncSession,
    tenant_id: UUID,
    user_id: UUID | None,
    action: str,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    """Write an audit log entry."""
    from sqlalchemy import text

    try:
        await session.execute(
            text(
                "INSERT INTO audit_logs ("
                "tenant_id, user_id, action, entity_type, entity_id, "
                "old_values, new_values, ip_address"
                ") VALUES ("
                ":tenant_id, :user_id, :action, :entity_type, :entity_id, "
                ":old_values, :new_values, :ip_address)"
            ),
            {
                "tenant_id": str(tenant_id),
                "user_id": str(user_id) if user_id else None,
                "action": action,
                "entity_type": entity_type,
                "entity_id": str(entity_id) if entity_id else None,
                "old_values": old_values,
                "new_values": new_values,
                "ip_address": ip_address,
            },
        )
    except Exception as e:
        logger.error("audit_log_failed", action=action, error=str(e))
