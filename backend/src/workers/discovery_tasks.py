from __future__ import annotations

import asyncio
from typing import Any

import structlog

from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(name="src.workers.discovery_tasks.run_discovery_search")  # type: ignore[reportUntypedFunctionDecorator]
def run_discovery_search(
    tenant_id: str,
    location: str,
    intent: str,
    radius_km: int = 50,
    max_results: int = 100,
    sources: list[str] | None = None,
) -> dict[str, Any]:
    """Execute a full discovery search as a background task."""
    logger.info("discovery_task_started", tenant_id=tenant_id, location=location)

    async def _run():
        from uuid import UUID

        from src.application.discovery.dto import DiscoverySearchRequest
        from src.application.discovery.orchestrator import DiscoveryOrchestrator
        from src.core.database import get_session_factory

        factory = get_session_factory()
        async with factory() as session:
            orchestrator = DiscoveryOrchestrator(session, UUID(tenant_id))
            request = DiscoverySearchRequest(
                location=location,
                radius_km=radius_km,
                intent=intent,
                max_results=max_results,
                sources=sources or [],
            )
            result = await orchestrator.execute(request)
            return {
                "search_id": str(result.search_id),
                "status": result.status,
                "companies_found": result.companies_found,
                "companies_new": result.companies_new,
                "error": result.error,
            }

    return asyncio.run(_run())


@celery_app.task(name="src.workers.discovery_tasks.cleanup_stale_jobs")  # type: ignore[reportUntypedFunctionDecorator]
def cleanup_stale_jobs() -> None:
    """Clean up scraper jobs that have been running too long."""
    import datetime
    from datetime import UTC

    from sqlalchemy import update

    from src.core.database import get_session_factory
    from src.domain.campaign.models import Campaign

    async def _cleanup() -> None:
        factory = get_session_factory()
        async with factory() as session:
            cutoff = datetime.datetime.now(UTC) - datetime.timedelta(hours=24)
            # Reset campaigns stuck in "running" for >24h back to "draft"
            stmt = (
                update(Campaign)
                .where(
                    Campaign.status == "running",
                    Campaign.updated_at < cutoff,  # type: ignore[union-attr]
                )
                .values(status="draft")
            )
            result = await session.execute(stmt)
            await session.commit()
            rowcount = getattr(result, "rowcount", 0)
            if rowcount > 0:
                logger.info("cleanup_reset_campaigns", count=rowcount)

        await _cleanup_browser_pool()

    asyncio.run(_cleanup())


async def _cleanup_browser_pool() -> None:
    """Stop the browser pool to release stale contexts."""
    from src.infrastructure.scraping.engine import get_browser_pool

    pool = get_browser_pool()
    if pool.active_count > 0:
        logger.info("cleanup_browser_pool", active_contexts=pool.active_count)
        await pool.stop()
