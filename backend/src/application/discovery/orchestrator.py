"""
Discovery orchestrator — the main pipeline that ties together
geocoding, intent parsing, multi-source scraping, and deduplication.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.discovery.dto import DiscoverySearchRequest, DiscoverySearchResponse
from src.core.events import DomainEvent, get_event_bus
from src.domain.company.models import Company, CompanySource
from src.domain.company.repository import CompanyRepository
from src.infrastructure.database.repositories.company_repo import SQLAlchemyCompanyRepository
from src.infrastructure.scraping.deduplication import get_deduplicator
from src.infrastructure.scraping.engine import BrowserPool, ScrapeResult, get_browser_pool
from src.infrastructure.scraping.geocoding import GeocodeResult, get_geocoding_service
from src.infrastructure.scraping.intent_parser import get_intent_parser
from src.infrastructure.scraping.plugins.base import ScraperConfig
from src.infrastructure.scraping.plugins.registry import get_plugin_registry
from src.infrastructure.scraping.rate_limiter import get_rate_limiter_registry

logger = structlog.get_logger()


# --- Domain Events ---

class DiscoveryStarted(DomainEvent):
    search_id: UUID = uuid4()
    query: str = ""


class CompanyDiscovered(DomainEvent):
    company_id: UUID = uuid4()
    name: str = ""
    source: str = ""


class DiscoveryCompleted(DomainEvent):
    search_id: UUID = uuid4()
    total_found: int = 0
    new_companies: int = 0


class DiscoveryOrchestrator:
    """
    Main discovery pipeline:
    1. Geocode location
    2. Parse intent → search rules
    3. Select sources
    4. Fan out to plugins (parallel)
    5. Deduplicate & normalize
    6. Save to database
    7. Emit events
    """

    def __init__(self, session: AsyncSession, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id
        self._company_repo: CompanyRepository = SQLAlchemyCompanyRepository(session)
        self._geocoding = get_geocoding_service()
        self._intent_parser = get_intent_parser()
        self._plugin_registry = get_plugin_registry()
        self._deduplicator = get_deduplicator()
        self._rate_limiters = get_rate_limiter_registry()
        self._browser_pool = get_browser_pool()
        self._event_bus = get_event_bus()

    async def execute(
        self, request: DiscoverySearchRequest
    ) -> DiscoverySearchResponse:
        """Execute the full discovery pipeline."""
        search_id = uuid4()
        started_at = datetime.now(timezone.utc)

        logger.info(
            "discovery_started",
            search_id=str(search_id),
            location=request.location,
            intent=request.intent,
        )

        try:
            # Step 1: Geocode location
            geocode_result = await self._geocode(request.location)
            if not geocode_result:
                return DiscoverySearchResponse(
                    search_id=search_id,
                    status="failed",
                    error=f"Could not geocode location: {request.location}",
                    started_at=started_at,
                )

            # Step 2: Parse intent
            search_rules = self._intent_parser.parse(request.intent)

            # Step 3: Select sources
            sources = self._select_sources(request, search_rules)

            # Step 4: Load existing companies for dedup
            existing = await self._load_existing_companies()
            self._deduplicator.add_existing_companies(existing)

            # Step 5: Fan out to plugins
            all_results = await self._run_plugins(
                sources, request, geocode_result, search_rules
            )

            # Step 6: Deduplicate
            unique_results = self._deduplicator.deduplicate(all_results)

            # Step 7: Save to database
            new_count = await self._save_companies(unique_results)

            completed_at = datetime.now(timezone.utc)
            logger.info(
                "discovery_completed",
                search_id=str(search_id),
                total=len(unique_results),
                new=new_count,
                duration_seconds=(completed_at - started_at).total_seconds(),
            )

            return DiscoverySearchResponse(
                search_id=search_id,
                status="completed",
                companies_found=len(unique_results),
                companies_new=new_count,
                companies_duplicate=len(all_results) - len(unique_results),
                sources_used=sources,
                search_rules={
                    "keywords": search_rules.keywords,
                    "industries": search_rules.industries,
                    "signals": search_rules.signals,
                    "has_website": search_rules.has_website,
                },
                started_at=started_at,
                completed_at=completed_at,
            )

        except Exception as e:
            logger.error("discovery_failed", search_id=str(search_id), error=str(e))
            return DiscoverySearchResponse(
                search_id=search_id,
                status="failed",
                error=str(e),
                started_at=started_at,
            )

    async def _geocode(self, location: str) -> GeocodeResult | None:
        return await self._geocoding.geocode(location)

    def _select_sources(
        self,
        request: DiscoverySearchRequest,
        search_rules: Any,
    ) -> list[str]:
        """Determine which sources to use."""
        if request.sources:
            return request.sources

        # Default sources — always include Google Maps and OSM
        default = ["google_maps", "openstreetmap"]

        # Add directories if location is in Argentina
        default.append("paginas_amarillas")

        # Filter to available plugins
        available = self._plugin_registry.list_source_names()
        return [s for s in default if s in available]

    async def _load_existing_companies(self) -> list[dict[str, Any]]:
        """Load existing companies for deduplication."""
        companies, _ = await self._company_repo.list_by_tenant(
            self._tenant_id, limit=10000
        )
        return [
            {
                "id": c.id,
                "name": c.name,
                "domain": c.domain,
                "city": c.city,
            }
            for c in companies
        ]

    async def _run_plugins(
        self,
        sources: list[str],
        request: DiscoverySearchRequest,
        geocode: GeocodeResult,
        search_rules: Any,
    ) -> list[ScrapeResult]:
        """Run all selected scraper plugins in parallel."""
        config = ScraperConfig(
            location=request.location,
            latitude=geocode.latitude,
            longitude=geocode.longitude,
            radius_km=request.radius_km,
            query=" ".join(search_rules.keywords) or request.intent,
            max_results=request.max_results // len(sources) if sources else request.max_results,
        )

        all_results: list[ScrapeResult] = []
        browser_pool = await self._ensure_browser()

        async def run_single_plugin(source: str) -> list[ScrapeResult]:
            plugin = self._plugin_registry.get(source)
            if not plugin:
                return []

            # Validate config
            error = await plugin.validate_config(config)
            if error:
                logger.warning("plugin_config_invalid", source=source, error=error)
                return []

            # Rate limit
            limiter = self._rate_limiters.get(source, rpm=plugin.default_rpm)
            await limiter.acquire()

            await plugin.on_before_scrape(config)

            context = None
            try:
                if plugin.requires_browser:
                    context = await browser_pool.acquire()
                results = await plugin.scrape(context, config)
                await plugin.on_after_scrape(results)
                return results
            except Exception as e:
                logger.error("plugin_failed", source=source, error=str(e))
                return []
            finally:
                if context:
                    await browser_pool.release(context)

        # Run plugins concurrently
        tasks = [run_single_plugin(source) for source in sources]
        results_lists = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results_lists:
            if isinstance(result, list):
                all_results.extend(result)
            elif isinstance(result, Exception):
                logger.error("plugin_task_exception", error=str(result))

        return all_results

    async def _ensure_browser(self) -> BrowserPool:
        pool = self._browser_pool
        if pool.active_count == 0:
            await pool.start()
        return pool

    async def _save_companies(self, results: list[ScrapeResult]) -> int:
        """Save deduplicated results to the database. Returns count of new companies."""
        new_count = 0
        for result in results:
            data = result.normalized_data
            name = data.get("name", "")
            if not name:
                continue

            # Check for existing by domain
            domain = data.get("website") or data.get("domain")
            if domain:
                existing = await self._company_repo.get_by_domain(self._tenant_id, domain)
                if existing:
                    # Update existing company
                    for field in ["phone", "email", "address", "google_rating", "google_review_count"]:
                        if data.get(field) and not getattr(existing, field, None):
                            setattr(existing, field, data[field])
                    continue

            # Create new company
            company = Company(
                tenant_id=self._tenant_id,
                name=name,
                domain=domain,
                industry=data.get("industry"),
                city=data.get("city"),
                province=data.get("province"),
                country=data.get("country"),
                address=data.get("address"),
                latitude=data.get("latitude"),
                longitude=data.get("longitude"),
                phone=data.get("phone"),
                email=data.get("email"),
                website=domain,
                google_place_id=data.get("google_place_id"),
                google_rating=data.get("google_rating"),
                google_review_count=data.get("google_review_count"),
                google_categories=data.get("google_categories"),
                business_hours=data.get("business_hours"),
                status="discovered",
            )
            company = await self._company_repo.create(company)

            # Save source
            source = CompanySource(
                company_id=company.id,
                source=result.source,
                source_id=result.source_id,
                source_url=result.source_url,
                raw_data=result.raw_data,
                confidence=result.confidence,
            )
            await self._session.flush()

            new_count += 1

        await self._session.commit()
        return new_count
