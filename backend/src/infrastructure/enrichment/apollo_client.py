"""
Apollo.io client — company search and contact enrichment via Apollo.io API.
Uses the apollo_api_key already configured in settings.
"""

from __future__ import annotations

from dataclasses import dataclass

import httpx
import structlog

from src.core.config import get_settings

logger = structlog.get_logger()


@dataclass
class ApolloContact:
    first_name: str
    last_name: str
    full_name: str
    title: str
    email: str
    phone: str
    linkedin_url: str


@dataclass
class ApolloCompany:
    name: str
    domain: str
    industry: str
    employee_count: str
    city: str
    state: str
    country: str
    phone: str
    linkedin_url: str


@dataclass
class ApolloResult:
    company: ApolloCompany | None
    contacts: list[ApolloContact]


class ApolloClient:
    """Client for Apollo.io API."""

    BASE_URL = "https://api.apollo.io/v1"

    def __init__(self) -> None:
        self._api_key = get_settings().apollo_api_key
        self._enabled = bool(self._api_key)

    @property
    def enabled(self) -> bool:
        return self._enabled

    async def enrich_company(self, domain: str) -> ApolloResult | None:
        """Search for company and contacts by domain."""
        if not self._enabled:
            return None

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                # Search for organization
                org_response = await client.get(
                    f"{self.BASE_URL}/organizations/search",
                    params={"api_key": self._api_key, "q_organization_domains": domain},
                )

                if org_response.status_code != 200:
                    logger.warning("apollo_org_search_error", status=org_response.status_code)
                    return None

                org_data = org_response.json().get("organizations", [])
                if not org_data:
                    return None

                org = org_data[0]
                company = ApolloCompany(
                    name=org.get("name", ""),
                    domain=org.get("primary_domain", ""),
                    industry=org.get("industry", ""),
                    employee_count=str(org.get("estimated_num_employees", "")),
                    city=org.get("city", ""),
                    state=org.get("state", ""),
                    country=org.get("country", ""),
                    phone=org.get("phone", ""),
                    linkedin_url=org.get("linkedin_url", ""),
                )

                # Search for contacts at this org
                contacts_response = await client.get(
                    f"{self.BASE_URL}/mixed_people/search",
                    params={
                        "api_key": self._api_key,
                        "q_organization_ids": org.get("id", ""),
                        "contact_email_status": "verified",
                        "per_page": 10,
                    },
                )

                contacts: list[ApolloContact] = []
                if contacts_response.status_code == 200:
                    for person in contacts_response.json().get("people", []):
                        contacts.append(
                            ApolloContact(
                                first_name=person.get("first_name", ""),
                                last_name=person.get("last_name", ""),
                                full_name=person.get("name", ""),
                                title=person.get("title", ""),
                                email=person.get("email", ""),
                                phone=person.get("sanitized_phone", ""),
                                linkedin_url=person.get("linkedin_url", ""),
                            )
                        )

                return ApolloResult(company=company, contacts=contacts)

        except Exception as e:
            logger.error("apollo_enrichment_failed", domain=domain, error=str(e))
            return None


async def get_apollo_client() -> ApolloClient:
    """Factory function for ApolloClient."""
    return ApolloClient()
