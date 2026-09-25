"""
Discovery application DTOs.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass
class CompanySummary:
    """Brief company info in search results."""

    id: UUID
    name: str
    domain: str | None = None
    phone: str | None = None
    email: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    has_website: bool | None = None


@dataclass
class DiscoverySearchRequest:
    """User's discovery search request."""

    location: str
    radius_km: int = 50
    intent: str = ""  # Natural language description of what they're looking for
    max_results: int = 100
    sources: list[str] = field(default_factory=list[str])  # Empty = all available


@dataclass
class DiscoverySearchResponse:
    """Result of a Discovery search."""

    search_id: UUID
    status: str  # "running", "completed", "failed"
    companies_found: int = 0
    companies_new: int = 0
    companies_duplicate: int = 0
    sources_used: list[str] = field(default_factory=list[str])
    search_rules: dict[str, Any] = field(default_factory=dict[str, Any])
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error: str | None = None
    company_ids: list[UUID] = field(default_factory=list)
    companies: list[CompanySummary] = field(default_factory=list)


@dataclass
class SearchRulesDTO:
    """Structured search rules for API response."""

    keywords: list[str] = field(default_factory=list[str])
    industries: list[str] = field(default_factory=list[str])
    signals: list[str] = field(default_factory=list[str])
    sources: list[str] = field(default_factory=list[str])
    has_website: bool | None = None
