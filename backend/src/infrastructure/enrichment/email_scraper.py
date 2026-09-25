"""
Email scraper — extracts email addresses from company websites.
Scrapes contact pages and uses regex to find email patterns.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

import httpx
import structlog
from bs4 import BeautifulSoup

logger = structlog.get_logger()

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

BLOCKED_DOMAINS = {
    "example.com",
    "test.com",
    "noreply.com",
    "no-reply.com",
    "donotreply.com",
    "mailer-daemon.com",
    "postmaster",
}

BLOCKED_PREFIXES = {
    "noreply",
    "no-reply",
    "donotreply",
    "mailer-daemon",
    "postmaster",
    "mailer",
    "apache",
    "wordpress",
    "notification",
}

CONTACT_PATHS = [
    "/contact",
    "/contacto",
    "/contact-us",
    "/contactanos",
    "/about",
    "/about-us",
    "/nosotros",
    "/equipo",
    "/team",
    "/support",
    "/ayuda",
]


@dataclass
class EmailResult:
    email: str
    confidence: float  # 0.0 - 1.0
    source: str  # "contact_page", "homepage", "pattern_guess"


class EmailScraper:
    """Scrapes email addresses from company websites."""

    def __init__(self, timeout: float = 10.0) -> None:
        self._timeout = timeout

    async def find_emails(self, domain: str) -> list[EmailResult]:
        """Find all email addresses for a domain."""
        results: list[EmailResult] = []
        seen: set[str] = set()

        async with httpx.AsyncClient(
            timeout=self._timeout,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; AILeadPlatform/0.1)"},
        ) as client:
            # 1. Try contact pages first (higher confidence)
            for path in CONTACT_PATHS:
                url = f"https://{domain}{path}"
                try:
                    emails = await self._scrape_page(client, url)
                    for email in emails:
                        email_lower = email.lower()
                        if email_lower not in seen and self._is_valid_email(email_lower):
                            seen.add(email_lower)
                            results.append(
                                EmailResult(
                                    email=email_lower,
                                    confidence=0.85,
                                    source="contact_page",
                                )
                            )
                except Exception as e:
                    logger.debug("contact_page_scrape_failed", url=url, error=str(e))
                    continue

            # 2. Try homepage as fallback
            if not results:
                try:
                    emails = await self._scrape_page(client, f"https://{domain}")
                    for email in emails:
                        email_lower = email.lower()
                        if email_lower not in seen and self._is_valid_email(email_lower):
                            seen.add(email_lower)
                            results.append(
                                EmailResult(
                                    email=email_lower,
                                    confidence=0.6,
                                    source="homepage",
                                )
                            )
                except Exception as e:
                    logger.debug("homepage_scrape_failed", domain=domain, error=str(e))

        return results

    async def _scrape_page(self, client: httpx.AsyncClient, url: str) -> list[str]:
        """Scrape a single page for email addresses."""
        try:
            response = await client.get(url)
            if response.status_code != 200:
                return []
            return self._extract_emails(response.text)
        except Exception:
            return []

    def _extract_emails(self, html: str) -> list[str]:
        """Extract email addresses from HTML content."""
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(separator=" ")

        # Also check mailto: links
        mailto_links = soup.find_all("a", href=re.compile(r"mailto:", re.I))
        mailto_emails = []
        for link in mailto_links:
            href = str(link.get("href") or "")
            email = href.replace("mailto:", "").split("?")[0].strip()
            if email:
                mailto_emails.append(email)

        # Find emails in text
        text_emails = EMAIL_REGEX.findall(text)

        return list(set(mailto_emails + text_emails))

    def _is_valid_email(self, email: str) -> bool:
        """Filter out invalid/generic emails."""
        local_part = email.split("@")[0].lower()
        domain_part = email.split("@")[1].lower() if "@" in email else ""

        if domain_part in BLOCKED_DOMAINS:
            return False
        if local_part in BLOCKED_PREFIXES:
            return False
        return len(local_part) >= 2


async def get_email_scraper() -> EmailScraper:
    """Factory function for EmailScraper."""
    return EmailScraper()
