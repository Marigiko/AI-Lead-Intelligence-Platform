"""
Discovery application DTOs.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass
class DiscoverySearchRequest:
    """User's discovery search request."""
    location: str
    radius_km: int = 50
    intent: str = ""  # Natural language description of what they're looking for
    max_results: int = 100
    sources: list[str] = field(default_factory=list)  # Empty = all available


@dataclass
class DiscoverySearchResponse:
    """Result of a discovery search."""
    search_id: UUID
    status: str  # "running", "completed", "failed"
    companies_found: int = 0
    companies_new: int = 0
    companies_duplicate: int = 0
    sources_used: list[str] = field(default_factory=list)
    search_rules: dict[str, Any] = field(default_factory=dict)
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error: str | None = None


@dataclass
class SearchRulesDTO:
    """Structured search rules for API response."""
    keywords: list[str] = field(default_factory=list)
    industries: list[str] = field(default_factory=list)
    signals: list[str] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)
    has_website: bool | None = None
