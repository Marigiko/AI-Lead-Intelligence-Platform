"""
Tech stack detection — analyzes a website's technology stack
from HTTP headers, meta tags, scripts, and patterns.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import httpx
import structlog
from bs4 import BeautifulSoup

logger = structlog.get_logger()


@dataclass
class TechStackResult:
    """Detected technology stack for a website."""
    cms: str | None = None
    framework: str | None = None
    hosting: str | None = None
    language: str | None = None
    analytics: list[str] = field(default_factory=list)
    has_ssl: bool = False
    has_whatsapp: bool = False
    has_chatbot: bool = False
    has_crm: bool = False
    has_ecommerce: bool = False
    has_meta_pixel: bool = False
    has_google_tag_manager: bool = False
    has_google_analytics: bool = False
    has_hotjar: bool = False
    has_clarity: bool = False
    technologies: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    raw_headers: dict[str, str] = field(default_factory=dict)


# Technology detection signatures
CMS_SIGNATURES: dict[str, list[str]] = {
    "WordPress": ["wp-content", "wp-includes", "wordpress", "wp-json"],
    "Shopify": ["shopify", "cdn.shopify.com", "myshopify.com"],
    "Wix": ["wix.com", "wixstatic.com", "parastorage.com"],
    "Squarespace": ["squarespace.com", "sqsp.com"],
    "Joomla": ["joomla", "/media/jui/", "com_content"],
    "Drupal": ["drupal", "sites/default/files", "Drupal.settings"],
    "Magento": ["magento", "Mage.", "skin/frontend/"],
    "PrestaShop": ["prestashop", "prestashop.com"],
    "Ghost": ["ghost.io", "ghost-',"],
    "Strapi": ["strapi", "api/"],
    "Contentful": ["contentful.com", "ctfassets.net"],
}

FRAMEWORK_SIGNATURES: dict[str, list[str]] = {
    "React": ["react", "reactdom", "_reactRoot", "data-reactroot"],
    "Next.js": ["_next/", "next/", "__next", "nextjs"],
    "Vue.js": ["vue", "vue.js", "vuejs", "data-v-"],
    "Nuxt.js": ["_nuxt/", "nuxt", "__nuxt"],
    "Angular": ["ng-version", "angular", "ng-app", "@angular"],
    "Svelte": ["svelte", "__svelte"],
    "Gatsby": ["gatsby", "___gatsby"],
    "Laravel": ["laravel", "csrf-token"],
    "Django": ["csrfmiddlewaretoken", "django"],
    "Ruby on Rails": ["csrf-token", "authenticity_token"],
    "ASP.NET": ["asp.net", "__VIEWSTATE", "__VIEWSTATEGENERATOR"],
    "PHP": [".php", "X-Powered-By: PHP"],
    "Bootstrap": ["bootstrap.min.css", "bootstrap.min.js"],
    "Tailwind CSS": ["tailwindcss", "tailwind"],
    "jQuery": ["jquery", "jquery.min.js"],
}

ANALYTICS_SIGNATURES: dict[str, list[str]] = {
    "Google Analytics": ["google-analytics.com", "googletagmanager.com/gtag", "gtag("],
    "Google Tag Manager": ["googletagmanager.com/gtm", "gtm.js"],
    "Facebook Pixel": ["facebook.net/en_US/fbevents", "fbq("],
    "Hotjar": ["hotjar.com", "hj("],
    "Microsoft Clarity": ["clarity.ms", "clarity.js"],
    "Mixpanel": ["mixpanel.com", "mixpanel.init"],
    "Amplitude": ["amplitude.com", "amplitude.getInstance"],
    "Segment": ["segment.com/analytics", "analytics.min.js"],
    "Matomo": ["matomo", "piwik"],
    "Plausible": ["plausible.io"],
    "Clarity": ["clarity.ms"],
}

ECOMMERCE_SIGNATURES: list[str] = [
    "woocommerce", "shopify", "cart", "checkout",
    "add-to-cart", "paypal", "mercadopago", "stripe",
    "mp-checkout", "carrito", "comprar",
]

WHATSAPP_SIGNATURES: list[str] = [
    "wa.me", "whatsapp.com", "api.whatsapp.com",
    "whatsapp://", "whatsapp:",
]

CHATBOT_SIGNATURES: list[str] = [
    "intercom", "crisp", "tawk.to", "zendesk",
    "drift", "hubspot messenger", "tidio", "livechat",
    "chatbot", "chat-widget", "msgsndr",
]

CRM_SIGNATURES: list[str] = [
    "hubspot", "salesforce", "pipedrive", "zoho",
    "freshdesk", "zendesk", "monday.com", "clickup",
    "gohighlevel", "highlevel",
]


class TechStackDetector:
    """Analyzes a website to detect its technology stack."""

    async def detect(self, url: str) -> TechStackResult:
        """Analyze a website URL and return detected technologies."""
        result = TechStackResult()
        result.has_ssl = url.startswith("https://")

        try:
            async with httpx.AsyncClient(
                timeout=15,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
            ) as client:
                resp = await client.get(url)
                html = resp.text
                headers = dict(resp.headers)

                # Store raw headers
                result.raw_headers = {
                    k: v for k, v in headers.items()
                    if k.lower().startswith(("server", "x-powered", "x-generator", "set-cookie"))
                }

                # Detect from headers
                self._detect_from_headers(headers, result)

                # Parse HTML
                soup = BeautifulSoup(html, "lxml")

                # Detect technologies from HTML
                self._detect_cms(soup, html, result)
                self._detect_framework(soup, html, result)
                self._detect_analytics(soup, html, result)
                self._detect_ecommerce(html, result)
                self._detect_whatsapp(soup, html, result)
                self._detect_chatbot(html, result)
                self._detect_crm(html, result)

                # Deduplicate technologies
                result.technologies = list(set(result.technologies))

        except httpx.ConnectError:
            result.errors.append("connection_failed")
        except httpx.TimeoutException:
            result.errors.append("timeout")
        except Exception as e:
            result.errors.append(f"detection_error: {str(e)[:100]}")

        return result

    def _detect_from_headers(self, headers: dict[str, str], result: TechStackResult) -> None:
        server = headers.get("server", "").lower()
        powered = headers.get("x-powered-by", "").lower()
        generator = headers.get("x-generator", "").lower()

        if "nginx" in server:
            result.hosting = "Nginx"
            result.technologies.append("Nginx")
        elif "apache" in server:
            result.hosting = "Apache"
            result.technologies.append("Apache")
        elif "cloudflare" in server:
            result.hosting = "Cloudflare"
            result.technologies.append("Cloudflare")
        elif "litespeed" in server:
            result.hosting = "LiteSpeed"
            result.technologies.append("LiteSpeed")

        if "php" in powered:
            result.language = "PHP"
            result.technologies.append("PHP")
        elif "asp.net" in powered:
            result.language = "ASP.NET"
            result.technologies.append("ASP.NET")

        if "wordpress" in generator:
            result.cms = "WordPress"

    def _detect_cms(self, soup: BeautifulSoup, html: str, result: TechStackResult) -> None:
        for cms, signatures in CMS_SIGNATURES.items():
            for sig in signatures:
                if sig.lower() in html.lower():
                    result.cms = cms
                    result.technologies.append(cms)
                    return

    def _detect_framework(self, soup: BeautifulSoup, html: str, result: TechStackResult) -> None:
        for framework, signatures in FRAMEWORK_SIGNATURES.items():
            for sig in signatures:
                if sig.lower() in html.lower():
                    result.framework = framework
                    result.technologies.append(framework)
                    return

    def _detect_analytics(self, soup: BeautifulSoup, html: str, result: TechStackResult) -> None:
        for tool, signatures in ANALYTICS_SIGNATURES.items():
            for sig in signatures:
                if sig.lower() in html.lower():
                    result.analytics.append(tool)
                    result.technologies.append(tool)
                    if "Google Analytics" in tool:
                        result.has_google_analytics = True
                    elif "Google Tag Manager" in tool:
                        result.has_google_tag_manager = True
                    elif "Facebook Pixel" in tool:
                        result.has_meta_pixel = True
                    elif "Hotjar" in tool:
                        result.has_hotjar = True
                    elif "Clarity" in tool:
                        result.has_clarity = True
                    break

    def _detect_ecommerce(self, html: str, result: TechStackResult) -> None:
        for sig in ECOMMERCE_SIGNATURES:
            if sig.lower() in html.lower():
                result.has_ecommerce = True
                result.technologies.append("E-commerce")
                return

    def _detect_whatsapp(self, soup: BeautifulSoup, html: str, result: TechStackResult) -> None:
        for sig in WHATSAPP_SIGNATURES:
            if sig.lower() in html.lower():
                result.has_whatsapp = True
                return

    def _detect_chatbot(self, html: str, result: TechStackResult) -> None:
        for sig in CHATBOT_SIGNATURES:
            if sig.lower() in html.lower():
                result.has_chatbot = True
                result.technologies.append("Chatbot")
                return

    def _detect_crm(self, html: str, result: TechStackResult) -> None:
        for sig in CRM_SIGNATURES:
            if sig.lower() in html.lower():
                result.has_crm = True
                result.technologies.append("CRM")
                return


# Singleton
_detector: TechStackDetector | None = None


def get_tech_detector() -> TechStackDetector:
    global _detector
    if _detector is None:
        _detector = TechStackDetector()
    return _detector
