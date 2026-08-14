"""
Waterfall email enrichment — combines multiple email sources in priority order.
Priority: website HTML scrape → Hunter.io → Apollo.io → Clearbit → Instagram → Pattern guess (last resort).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import structlog

from src.core.config import get_settings
from src.infrastructure.enrichment.apollo_client import ApolloClient, get_apollo_client
from src.infrastructure.enrichment.clearbit_client import ClearbitClient, get_clearbit_client
from src.infrastructure.enrichment.email_guesser import EmailGuesser, get_email_guesser
from src.infrastructure.enrichment.email_scraper import EmailScraper, get_email_scraper
from src.infrastructure.enrichment.hunter_client import HunterClient, get_hunter_client

logger = structlog.get_logger()


@dataclass
class EnrichedContact:
    email: Optional[str]
    email_confidence: str  # "verified", "inferred", "unverified"
    phone: Optional[str]
    phone_confidence: str
    sources_used: list[str]


class WaterfallEnrichment:
    """
    Combines email sources in priority order:
    1. Website scraping (free, high confidence)
    2. Pattern guessing + SMTP verify (free, medium confidence)
    3. Hunter.io API (paid, highest confidence)
    """

    def __init__(
        self,
        email_scraper: EmailScraper | None = None,
        email_guesser: EmailGuesser | None = None,
        hunter_client: HunterClient | None = None,
    ) -> None:
        self._scraper = email_scraper
        self._guesser = email_guesser
        self._hunter = hunter_client

    async def enrich(self, domain: str, existing_email: str | None = None) -> EnrichedContact:
        """Run waterfall enrichment for a domain."""
        sources_used: list[str] = []
        found_email: str | None = existing_email
        email_confidence = "unverified"

        # Already have an email from discovery (OSM, etc.)
        if existing_email:
            return EnrichedContact(
                email=existing_email,
                email_confidence="inferred",
                phone=None,
                phone_confidence="unverified",
                sources_used=["discovery_source"],
            )

        # Step 1: Scrape company website HTML (PRIMARY source)
        if not found_email:
            scraper = self._scraper or await get_email_scraper()
            scrape_results = await scraper.find_emails(domain)
            if scrape_results:
                best = max(scrape_results, key=lambda r: r.confidence)
                found_email = best.email
                email_confidence = "scraped"
                sources_used.append("website_scrape")
                logger.info("email_found_via_scrape", domain=domain, email=found_email)

        # Step 2: Hunter.io API (verified email database)
        if not found_email and get_settings().hunter_api_key:
            hunter = self._hunter or await get_hunter_client()
            if hunter.enabled:
                hunter_result = await hunter.domain_search(domain)
                if hunter_result and hunter_result.emails:
                    verified = [e for e in hunter_result.emails if e.verified]
                    if verified:
                        found_email = verified[0].email
                        email_confidence = "verified"
                    else:
                        best = max(hunter_result.emails, key=lambda e: e.confidence)
                        found_email = best.email
                        email_confidence = "database"
                    sources_used.append("hunter_api")
                    logger.info("email_found_via_hunter", domain=domain, email=found_email)

        # Step 3: Apollo.io API (B2B contact database)
        if not found_email and get_settings().apollo_api_key:
            apollo = await get_apollo_client()
            if apollo.enabled:
                apollo_result = await apollo.enrich_company(domain)
                if apollo_result and apollo_result.contacts:
                    with_email = [c for c in apollo_result.contacts if c.email]
                    if with_email:
                        found_email = with_email[0].email
                        email_confidence = "verified"
                        sources_used.append("apollo_api")
                        logger.info("email_found_via_apollo", domain=domain, email=found_email)

        # Step 4: Clearbit API (company enrichment)
        if not found_email and get_settings().clearbit_api_key:
            clearbit = await get_clearbit_client()
            if clearbit.enabled:
                clearbit_result = await clearbit.enrich_company(domain)
                if clearbit_result and clearbit_result.people:
                    with_email = [p for p in clearbit_result.people if p.email]
                    if with_email:
                        found_email = with_email[0].email
                        email_confidence = "verified"
                        sources_used.append("clearbit_api")
                        logger.info("email_found_via_clearbit", domain=domain, email=found_email)

        # Step 5: Pattern guessing (LAST RESORT - least reliable)
        if not found_email:
            guesser = self._guesser or await get_email_guesser(verify_smtp=False)
            guesses = await guesser.guess_emails(domain)
            if guesses:
                found_email = guesses[0].email
                email_confidence = "inferred"
                sources_used.append("pattern_guess")
                logger.info("email_found_via_guess", domain=domain, email=found_email)

        return EnrichedContact(
            email=found_email,
            email_confidence=email_confidence,
            phone=None,
            phone_confidence="unverified",
            sources_used=sources_used,
        )


async def get_waterfall_enrichment() -> WaterfallEnrichment:
    """Factory function for WaterfallEnrichment."""
    return WaterfallEnrichment()
