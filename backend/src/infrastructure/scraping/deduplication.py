"""
Company deduplication — merges results from multiple sources.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import structlog
from rapidfuzz import fuzz

if TYPE_CHECKING:
    from uuid import UUID

    from src.infrastructure.scraping.engine import ScrapeResult

logger = structlog.get_logger()

# Threshold for fuzzy name matching (0-100)
NAME_SIMILARITY_THRESHOLD = 85


class Deduplicator:
    """Deduplicates and merges company results from multiple sources."""

    def __init__(self) -> None:
        self._seen: dict[str, dict[str, Any]] = {}  # canonical_key -> merged data

    def _canonical_key(self, name: str, domain: str | None = None, city: str | None = None) -> str:
        """Generate a canonical key for deduplication."""
        # Normalize name
        normalized = name.lower().strip()
        for suffix in [" s.a.", " s.r.l.", " s.r.l", " s.a.", " ltda.", " ltda", " inc.", " corp."]:
            normalized = normalized.replace(suffix, "")
        normalized = " ".join(normalized.split())

        # Use domain if available (strongest signal)
        if domain:
            return f"domain:{domain.lower().strip()}"

        # Use name + city as fallback
        city_part = f":{city.lower().strip()}" if city else ""
        return f"name:{normalized}{city_part}"

    def _fuzzy_match(self, name1: str, name2: str) -> bool:
        """Check if two names are similar enough to be the same company."""
        score = fuzz.token_sort_ratio(name1.lower(), name2.lower())
        return score >= NAME_SIMILARITY_THRESHOLD

    def add_existing_companies(self, companies: list[dict[str, Any]]) -> None:
        """Add existing database companies to the seen set for deduplication."""
        for company in companies:
            name = company.get("name", "")
            domain = company.get("domain")
            city = company.get("city")
            key = self._canonical_key(name, domain, city)
            self._seen[key] = {
                "id": company.get("id"),
                "name": name,
                "domain": domain,
                "city": city,
            }

    def deduplicate(
        self,
        results: list[ScrapeResult],
        existing_company_ids: set[UUID] | None = None,  # noqa: ARG002
    ) -> list[ScrapeResult]:
        """
        Deduplicate results and merge data from multiple sources.

        Returns a list of unique results with merged data.
        """
        merged: dict[str, ScrapeResult] = {}
        duplicates_found = 0

        for result in results:
            data = result.normalized_data
            name = data.get("name", "")
            domain = data.get("website") or data.get("domain")
            city = data.get("city")

            if not name:
                continue

            key = self._canonical_key(name, domain, city)

            # Check for existing match
            if key in merged:
                # Merge data — prefer non-empty values
                existing = merged[key]
                for field_name, value in data.items():
                    if value and not existing.normalized_data.get(field_name):
                        existing.normalized_data[field_name] = value
                # Keep highest confidence
                existing.confidence = max(existing.confidence, result.confidence)
                duplicates_found += 1
                continue

            # Check fuzzy match against existing entries
            matched = False
            for _existing_key, existing_result in merged.items():
                existing_name = existing_result.normalized_data.get("name", "")
                if self._fuzzy_match(name, existing_name):
                    # Merge into existing
                    for field_name, value in data.items():
                        if value and not existing_result.normalized_data.get(field_name):
                            existing_result.normalized_data[field_name] = value
                    existing_result.confidence = max(existing_result.confidence, result.confidence)
                    duplicates_found += 1
                    matched = True
                    break

            if not matched:
                merged[key] = result

        deduplicated = list(merged.values())
        logger.info(
            "deduplication_complete",
            input_count=len(results),
            output_count=len(deduplicated),
            duplicates_found=duplicates_found,
        )
        return deduplicated


# Singleton
_deduplicator: Deduplicator | None = None


def get_deduplicator() -> Deduplicator:
    global _deduplicator
    if _deduplicator is None:
        _deduplicator = Deduplicator()
    return _deduplicator
