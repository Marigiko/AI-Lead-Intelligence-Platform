"""
Social media presence detection — checks if a company has social profiles.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import httpx
import structlog
from bs4 import BeautifulSoup

logger = structlog.get_logger()


@dataclass
class SocialResult:
    """Detected social media presence."""
    facebook_url: str | None = None
    instagram_url: str | None = None
    linkedin_url: str | None = None
    tiktok_url: str | None = None
    twitter_url: str | None = None
    youtube_url: str | None = None
    has_social_links: bool = False
    social_count: int = 0

    def to_dict(self) -> dict:
        return {
            "facebook_url": self.facebook_url,
            "instagram_url": self.instagram_url,
            "linkedin_url": self.linkedin_url,
            "tiktok_url": self.tiktok_url,
            "twitter_url": self.twitter_url,
            "youtube_url": self.youtube_url,
            "social_count": self.social_count,
        }


class SocialMediaDetector:
    """Detects social media links on a website."""

    SOCIAL_PATTERNS: dict[str, list[str]] = {
        "facebook": ["facebook.com", "fb.com", "fb.me"],
        "instagram": ["instagram.com"],
        "linkedin": ["linkedin.com", "linkedin.fr"],
        "tiktok": ["tiktok.com"],
        "twitter": ["twitter.com", "x.com"],
        "youtube": ["youtube.com", "youtu.be"],
    }

    async def detect(self, url: str) -> SocialResult:
        """Detect social media links on a website."""
        result = SocialResult()

        try:
            async with httpx.AsyncClient(
                timeout=10,
                follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0"},
            ) as client:
                resp = await client.get(url)
                html = resp.text

            soup = BeautifulSoup(html, "lxml")

            # Find all links
            links = soup.find_all("a", href=True)
            for link in links:
                href = link["href"].lower()
                for platform, patterns in self.SOCIAL_PATTERNS.items():
                    for pattern in patterns:
                        if pattern in href:
                            full_url = link["href"]
                            if not full_url.startswith("http"):
                                full_url = f"https:{full_url}" if full_url.startswith("//") else f"{url.rstrip('/')}/{full_url.lstrip('/')}"

                            if platform == "facebook" and not result.facebook_url:
                                result.facebook_url = full_url
                            elif platform == "instagram" and not result.instagram_url:
                                result.instagram_url = full_url
                            elif platform == "linkedin" and not result.linkedin_url:
                                result.linkedin_url = full_url
                            elif platform == "tiktok" and not result.tiktok_url:
                                result.tiktok_url = full_url
                            elif platform == "twitter" and not result.twitter_url:
                                result.twitter_url = full_url
                            elif platform == "youtube" and not result.youtube_url:
                                result.youtube_url = full_url
                            break

            # Also check meta tags for social links
            meta_links = soup.find_all("meta", attrs={"property": "og:url"})
            for meta in meta_links:
                content = meta.get("content", "").lower()
                for platform, patterns in self.SOCIAL_PATTERNS.items():
                    for pattern in patterns:
                        if pattern in content:
                            if platform == "facebook" and not result.facebook_url:
                                result.facebook_url = meta["content"]
                            elif platform == "instagram" and not result.instagram_url:
                                result.instagram_url = meta["content"]

            result.social_count = sum(1 for v in [
                result.facebook_url, result.instagram_url,
                result.linkedin_url, result.tiktok_url,
                result.twitter_url, result.youtube_url,
            ] if v)
            result.has_social_links = result.social_count > 0

        except Exception as e:
            logger.debug("social_detection_error", url=url, error=str(e))

        return result


# Singleton
_detector: SocialMediaDetector | None = None


def get_social_detector() -> SocialMediaDetector:
    global _detector
    if _detector is None:
        _detector = SocialMediaDetector()
    return _detector
