"""
Clearbit client — company and person enrichment via Clearbit API.
Uses the clearbit_api_key already configured in settings.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import httpx
import structlog

from src.core.config import get_settings

logger = structlog.get_logger()


@dataclass
class ClearbitCompany:
    name: str
    domain: str
    industry: str
    sector: str
    employee_count: str
    annual_revenue: str
    city: str
    state: str
    country: str
    description: str
    logo_url: str
    linkedin_url: str
    facebook_url: str
    twitter_url: str
    phone: str


@dataclass
class ClearbitPerson:
    full_name: str
    title: str
    email: str
    linkedin_url: str


@dataclass
class ClearbitResult:
    company: ClearbitCompany | None
    people: list[ClearbitPerson]


class ClearbitClient:
    """Client for Clearbit API."""

    COMPANY_URL = "https://company.clearbit.com/v2/companies/find"
    PERSON_URL = "https://person.clearbit.com/v2/combined/find"

    def __init__(self) -> None:
        self._api_key = get_settings().clearbit_api_key
        self._enabled = bool(self._api_key)

    @property
    def enabled(self) -> bool:
        return self._enabled

    async def enrich_company(self, domain: str) -> Optional[ClearbitResult]:
        """Look up company and person data by domain."""
        if not self._enabled:
            return None

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                # Company lookup
                company_response = await client.get(
                    self.COMPANY_URL,
                    params={"domain": domain},
                    headers={"Authorization": f"Bearer {self._api_key}"},
                )

                company: ClearbitCompany | None = None
                if company_response.status_code == 200:
                    data = company_response.json()
                    company = ClearbitCompany(
                        name=data.get("name", ""),
                        domain=data.get("domain", ""),
                        industry=data.get("category", {}).get("industry", ""),
                        sector=data.get("category", {}).get("sector", ""),
                        employee_count=str(data.get("metrics", {}).get("employees", "")),
                        annual_revenue=str(data.get("metrics", {}).get("estimatedAnnualRevenue", "")),
                        city=data.get("geo", {}).get("city", ""),
                        state=data.get("geo", {}).get("state", ""),
                        country=data.get("geo", {}).get("country", ""),
                        description=data.get("description", ""),
                        logo_url=data.get("logo", ""),
                        linkedin_url=data.get("linkedin", {}).get("handle", ""),
                        facebook_url=data.get("facebook", {}).get("handle", ""),
                        twitter_url=data.get("twitter", {}).get("handle", ""),
                        phone=data.get("phone", ""),
                    )

                # Person lookup (by domain — returns decision makers)
                people_response = await client.get(
                    self.PERSON_URL,
                    params={"domain": domain},
                    headers={"Authorization": f"Bearer {self._api_key}"},
                )

                people: list[ClearbitPerson] = []
                if people_response.status_code == 200:
                    person_data = people_response.json().get("person", {})
                    if person_data:
                        people.append(ClearbitPerson(
                            full_name=person_data.get("name", {}).get("fullName", ""),
                            title=person_data.get("employment", {}).get("title", ""),
                            email=person_data.get("email", ""),
                            linkedin_url=person_data.get("linkedin", {}).get("handle", ""),
                        ))

                if company or people:
                    return ClearbitResult(company=company, people=people)

                return None

        except Exception as e:
            logger.error("clearbit_enrichment_failed", domain=domain, error=str(e))
            return None


async def get_clearbit_client() -> ClearbitClient:
    """Factory function for ClearbitClient."""
    return ClearbitClient()
