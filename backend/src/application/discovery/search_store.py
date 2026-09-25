"""Redis-backed persistence for discovery search results.

Searches run in Celery workers while results are polled from the API process,
so the historical in-memory dict could never work across processes. Responses
are serialized as JSON under a key that expires after 24 hours.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from src.core.redis import get_redis

if TYPE_CHECKING:
    from src.application.discovery.dto import DiscoverySearchResponse

SEARCH_TTL_SECONDS = 24 * 60 * 60


def _key(search_id: str) -> str:
    return f"nexus:discovery:{search_id}"


def _serialize(response: DiscoverySearchResponse) -> str:
    data = {
        "search_id": str(response.search_id),
        "status": response.status,
        "companies_found": response.companies_found,
        "companies_new": response.companies_new,
        "companies_duplicate": response.companies_duplicate,
        "sources_used": response.sources_used,
        "search_rules": response.search_rules,
        "started_at": (response.started_at.isoformat() if response.started_at else None),
        "completed_at": (response.completed_at.isoformat() if response.completed_at else None),
        "error": response.error,
        "company_ids": [str(cid) for cid in response.company_ids],
        "companies": [
            {
                "id": str(c.id),
                "name": c.name,
                "domain": c.domain,
                "phone": c.phone,
                "email": c.email,
                "latitude": c.latitude,
                "longitude": c.longitude,
                "has_website": c.has_website,
            }
            for c in response.companies
        ],
    }
    return json.dumps(data)


def _deserialize(raw: str) -> DiscoverySearchResponse:
    from datetime import datetime as dt
    from uuid import UUID

    from src.application.discovery.dto import CompanySummary, DiscoverySearchResponse

    data: dict[str, Any] = json.loads(raw)

    def _parse_dt(value: str | None) -> Any:
        return dt.fromisoformat(value) if value else None

    return DiscoverySearchResponse(
        search_id=UUID(data["search_id"]),
        status=data["status"],
        companies_found=data["companies_found"],
        companies_new=data["companies_new"],
        companies_duplicate=data["companies_duplicate"],
        sources_used=data["sources_used"],
        search_rules=data["search_rules"],
        started_at=_parse_dt(data["started_at"]),
        completed_at=_parse_dt(data["completed_at"]),
        error=data["error"],
        company_ids=[UUID(cid) for cid in data["company_ids"]],
        companies=[
            CompanySummary(
                id=UUID(c["id"]),
                name=c["name"],
                domain=c["domain"],
                phone=c["phone"],
                email=c["email"],
                latitude=c["latitude"],
                longitude=c["longitude"],
                has_website=c["has_website"],
            )
            for c in data["companies"]
        ],
    )


async def save_search(response: DiscoverySearchResponse) -> None:
    """Persist a search state (pending or final) with a 24h TTL."""
    client = await get_redis()
    await client.set(_key(str(response.search_id)), _serialize(response), ex=SEARCH_TTL_SECONDS)


async def load_search(search_id: str | UUID) -> DiscoverySearchResponse | None:
    """Load a search by id; returns None when missing or expired."""
    from src.application.discovery.dto import DiscoverySearchResponse as _Resp

    client = await get_redis()
    raw = await client.get(_key(str(search_id)))
    if raw is None:
        return None
    try:
        return _deserialize(raw)
    except (KeyError, TypeError, ValueError):
        # Corrupted payload should not break polling forever.
        return _Resp(search_id=UUID(str(search_id)), status="failed", error="corrupted")


def now_utc() -> datetime:
    return datetime.now(UTC)
