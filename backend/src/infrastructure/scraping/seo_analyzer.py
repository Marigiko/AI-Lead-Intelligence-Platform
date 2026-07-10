"""
SEO analyzer — checks meta tags, performance indicators, and SEO health.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import httpx
import structlog
from bs4 import BeautifulSoup

logger = structlog.get_logger()


def _match_og_property(value: str | None) -> bool:
    return value is not None and value.startswith("og:")


def _match_twitter_name(value: str | None) -> bool:
    return value is not None and value.startswith("twitter:")


@dataclass
class SeoResult:
    """SEO analysis result for a website."""

    # Meta tags
    has_title: bool = False
    title_length: int = 0
    has_meta_description: bool = False
    meta_description_length: int = 0
    has_h1: bool = False
    h1_count: int = 0
    has_robots_meta: bool = False
    has_canonical: bool = False
    has_og_tags: bool = False
    has_twitter_cards: bool = False
    has_viewport_meta: bool = False
    has_favicon: bool = False
    has_structured_data: bool = False

    # Content
    word_count: int = 0
    image_count: int = 0
    images_with_alt: int = 0
    internal_links: int = 0
    external_links: int = 0
    has_sitemap: bool = False
    has_robots_txt: bool = False

    # Technical
    is_https: bool = False
    has_redirect: bool = False
    response_time_ms: int = 0
    page_size_kb: int = 0

    # Score
    score: int = 0  # 0-100
    issues: list[str] = field(default_factory=list[str])
    recommendations: list[str] = field(default_factory=list[str])

    def to_dict(self) -> dict[str, Any]:
        return {
            "has_title": self.has_title,
            "title_length": self.title_length,
            "has_meta_description": self.has_meta_description,
            "meta_description_length": self.meta_description_length,
            "has_h1": self.has_h1,
            "h1_count": self.h1_count,
            "has_canonical": self.has_canonical,
            "has_og_tags": self.has_og_tags,
            "has_viewport_meta": self.has_viewport_meta,
            "word_count": self.word_count,
            "image_count": self.image_count,
            "images_with_alt": self.images_with_alt,
            "internal_links": self.internal_links,
            "external_links": self.external_links,
            "has_sitemap": self.has_sitemap,
            "has_robots_txt": self.has_robots_txt,
            "is_https": self.is_https,
            "response_time_ms": self.response_time_ms,
            "page_size_kb": self.page_size_kb,
            "score": self.score,
            "issues": self.issues,
            "recommendations": self.recommendations,
        }


class SeoAnalyzer:
    """Analyzes a website for SEO health and best practices."""

    async def analyze(self, url: str) -> SeoResult:
        """Perform SEO analysis on a URL."""
        result = SeoResult()
        result.is_https = url.startswith("https://")

        try:
            # Check robots.txt
            result.has_robots_txt = await self._check_robots_txt(url)

            # Check sitemap
            result.has_sitemap = await self._check_sitemap(url)

            # Fetch main page
            import time

            start = time.monotonic()

            async with httpx.AsyncClient(
                timeout=15,
                follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (compatible; LeadPlatformBot/0.1)"},
            ) as client:
                resp = await client.get(url)

            result.response_time_ms = int((time.monotonic() - start) * 1000)
            result.page_size_kb = len(resp.content) // 1024
            result.has_redirect = str(resp.url) != url

            html = resp.text
            soup = BeautifulSoup(html, "lxml")

            # Analyze meta tags
            self._analyze_meta(soup, result)

            # Analyze content
            self._analyze_content(soup, result)

            # Analyze links
            self._analyze_links(soup, url, result)

            # Calculate score
            self._calculate_score(result)

        except httpx.ConnectError:
            result.issues.append("Connection failed")
            result.score = 0
        except httpx.TimeoutException:
            result.issues.append("Page load timeout")
            result.score = 10
        except Exception as e:
            result.issues.append(f"Analysis error: {str(e)[:100]}")
            result.score = 0

        return result

    def _analyze_meta(self, soup: BeautifulSoup, result: SeoResult) -> None:
        # Title
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            result.has_title = True
            result.title_length = len(title_tag.string.strip())
            if result.title_length < 30:
                result.issues.append("Title too short (< 30 chars)")
            elif result.title_length > 60:
                result.issues.append("Title too long (> 60 chars)")
        else:
            result.issues.append("Missing title tag")

        # Meta description
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            result.has_meta_description = True
            result.meta_description_length = len(str(meta_desc["content"]).strip())
            if result.meta_description_length < 120:
                result.issues.append("Meta description too short (< 120 chars)")
            elif result.meta_description_length > 160:
                result.issues.append("Meta description too long (> 160 chars)")
        else:
            result.issues.append("Missing meta description")

        # H1
        h1_tags = soup.find_all("h1")
        result.h1_count = len(h1_tags)
        result.has_h1 = result.h1_count > 0
        if result.h1_count == 0:
            result.issues.append("Missing H1 tag")
        elif result.h1_count > 1:
            result.issues.append(f"Multiple H1 tags ({result.h1_count})")

        # Canonical
        canonical = soup.find("link", attrs={"rel": "canonical"})
        result.has_canonical = canonical is not None
        if not result.has_canonical:
            result.recommendations.append("Add canonical URL")

        # Open Graph
        og_tags = soup.find_all("meta", attrs={"property": _match_og_property})
        result.has_og_tags = len(og_tags) > 0
        if not result.has_og_tags:
            result.recommendations.append("Add Open Graph tags for social sharing")

        # Twitter Cards
        twitter_tags = soup.find_all("meta", attrs={"name": _match_twitter_name})
        result.has_twitter_cards = len(twitter_tags) > 0

        # Viewport
        viewport = soup.find("meta", attrs={"name": "viewport"})
        result.has_viewport_meta = viewport is not None
        if not result.has_viewport_meta:
            result.issues.append("Missing viewport meta tag (not mobile-friendly)")

        # Robots meta
        robots_meta = soup.find("meta", attrs={"name": "robots"})
        result.has_robots_meta = robots_meta is not None

        # Favicon
        favicon = soup.find("link", attrs={"rel": "icon"}) or soup.find(
            "link", attrs={"rel": "shortcut icon"}
        )
        result.has_favicon = favicon is not None

        # Structured data
        structured = soup.find_all("script", attrs={"type": "application/ld+json"})
        result.has_structured_data = len(structured) > 0
        if not result.has_structured_data:
            result.recommendations.append("Add structured data (Schema.org)")

    def _analyze_content(self, soup: BeautifulSoup, result: SeoResult) -> None:
        # Word count
        text = soup.get_text(separator=" ", strip=True)
        words = text.split()
        result.word_count = len(words)
        if result.word_count < 300:
            result.issues.append(f"Low word count ({result.word_count})")

        # Images
        images = soup.find_all("img")
        result.image_count = len(images)
        result.images_with_alt = sum(1 for img in images if str(img.get("alt", "")).strip())
        if result.image_count > 0 and result.images_with_alt < result.image_count:
            missing = result.image_count - result.images_with_alt
            result.issues.append(f"{missing} images missing alt text")

    def _analyze_links(self, soup: BeautifulSoup, base_url: str, result: SeoResult) -> None:
        from urllib.parse import urlparse

        base_domain = urlparse(base_url).netloc

        links = soup.find_all("a", href=True)
        for link in links:
            href = str(link["href"])
            if href.startswith(("#", "javascript:")):
                continue
            try:
                parsed = urlparse(href)
                if parsed.netloc == base_domain or not parsed.netloc:
                    result.internal_links += 1
                else:
                    result.external_links += 1
            except Exception:
                result.internal_links += 1

    async def _check_robots_txt(self, url: str) -> bool:
        try:
            from urllib.parse import urlparse

            parsed = urlparse(url)
            robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(robots_url)
                return resp.status_code == 200
        except Exception:
            return False

    async def _check_sitemap(self, url: str) -> bool:
        try:
            from urllib.parse import urlparse

            parsed = urlparse(url)
            for path in ["/sitemap.xml", "/sitemap_index.xml"]:
                sitemap_url = f"{parsed.scheme}://{parsed.netloc}{path}"
                async with httpx.AsyncClient(timeout=5) as client:
                    resp = await client.get(sitemap_url)
                    if resp.status_code == 200 and "xml" in resp.headers.get("content-type", ""):
                        return True
            return False
        except Exception:
            return False

    def _calculate_score(self, result: SeoResult) -> None:
        """Calculate SEO score (0-100) based on findings."""
        score = 0

        # Title (15 points)
        if result.has_title:
            score += 5
            if 30 <= result.title_length <= 60:
                score += 10

        # Meta description (15 points)
        if result.has_meta_description:
            score += 5
            if 120 <= result.meta_description_length <= 160:
                score += 10

        # H1 (10 points)
        if result.has_h1 and result.h1_count == 1:
            score += 10
        elif result.has_h1:
            score += 5

        # Mobile-friendly (10 points)
        if result.has_viewport_meta:
            score += 10

        # HTTPS (10 points)
        if result.is_https:
            score += 10

        # Content (15 points)
        if result.word_count >= 300:
            score += 5
        if result.word_count >= 800:
            score += 5
        if result.image_count > 0 and result.images_with_alt == result.image_count:
            score += 5

        # Technical (15 points)
        if result.has_canonical:
            score += 5
        if result.has_og_tags:
            score += 5
        if result.has_structured_data:
            score += 5

        # Links (10 points)
        if result.internal_links > 0:
            score += 5
        if result.has_sitemap:
            score += 5

        result.score = min(100, score)


# Singleton
_analyzer: SeoAnalyzer | None = None


def get_seo_analyzer() -> SeoAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = SeoAnalyzer()
    return _analyzer
