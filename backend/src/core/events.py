from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable, Coroutine
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

import orjson


@dataclass(frozen=True)
class DomainEvent:
    """Base class for all domain events."""

    event_id: UUID = field(default_factory=uuid4)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    tenant_id: UUID | None = None
    metadata: dict[str, Any] = field(default_factory=dict[str, Any])

    @property
    def event_type(self) -> str:
        return self.__class__.__name__

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_id": str(self.event_id),
            "event_type": self.event_type,
            "occurred_at": self.occurred_at.isoformat(),
            "tenant_id": str(self.tenant_id) if self.tenant_id else None,
            "metadata": self.metadata,
        }

    def to_json(self) -> bytes:
        return orjson.dumps(self.to_dict())


# Type alias for event handlers
EventHandler = Callable[["DomainEvent"], Coroutine[Any, Any, None]]


class EventBus:
    """In-process event bus with optional Redis pub/sub for cross-worker events."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = defaultdict(list)

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        self._handlers[event_type].append(handler)

    def unsubscribe(self, event_type: str, handler: EventHandler) -> None:
        if handler in self._handlers[event_type]:
            self._handlers[event_type].remove(handler)

    async def publish(self, event: DomainEvent) -> None:
        handlers = self._handlers.get(event.event_type, [])
        handlers += self._handlers.get("*", [])  # Wildcard handlers
        for handler in handlers:
            try:
                await handler(event)
            except Exception:
                # Log but don't crash — event handlers should be resilient
                import structlog

                logger = structlog.get_logger()
                logger.error(
                    "event_handler_failed",
                    event_type=event.event_type,
                    handler=handler.__name__,
                    exc_info=True,
                )

    def clear(self) -> None:
        self._handlers.clear()


# Singleton event bus
_event_bus: EventBus | None = None


def get_event_bus() -> EventBus:
    global _event_bus
    if _event_bus is None:
        _event_bus = EventBus()
    return _event_bus
