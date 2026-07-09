from __future__ import annotations

import asyncio

import structlog
from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(name="src.workers.discovery_tasks.run_discovery_search")
def run_discovery_search(
    tenant_id: str,
    location: str,
    intent: str,
    radius_km: int = 50,
    max_results: int = 100,
    sources: list[str] | None = None,
) -> dict:
    """Execute a full discovery search as a background task."""
    logger.info("discovery_task_started", tenant_id=tenant_id, location=location)

    async def _run():
        from uuid import UUID
        from src.core.database import get_session_factory
        from src.application.discovery.dto import DiscoverySearchRequest
        from src.application.discovery.orchestrator import DiscoveryOrchestrator

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


@celery_app.task(name="src.workers.discovery_tasks.cleanup_stale_jobs")
def cleanup_stale_jobs() -> None:
    """Clean up scraper jobs that have been running too long."""
    logger.info("cleanup_stale_jobs")
    # TODO: Implement stale job cleanup
