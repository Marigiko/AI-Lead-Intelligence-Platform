"""
AI Intent Parser — converts natural language business search intent into structured search rules.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field

import structlog

logger = structlog.get_logger()


@dataclass
class SearchRules:
    """Structured search rules derived from natural language intent."""
    keywords: list[str] = field(default_factory=list)
    industries: list[str] = field(default_factory=list)
    exclude_industries: list[str] = field(default_factory=list)
    signals: list[str] = field(default_factory=list)
    # Signals like: "no_website", "slow_website", "no_seo", "no_reviews", etc.
    sources: list[str] = field(default_factory=list)
    # Preferred sources: ["google_maps", "directories", "linkedin"]
    min_reviews: int | None = None
    max_reviews: int | None = None
    has_website: bool | None = None  # True = must have, False = must not have, None = any


# Mapping of common Spanish intents to structured rules
INTENT_MAPPINGS: dict[str, dict] = {
    "sin pagina web": {
        "has_website": False,
        "signals": ["no_website"],
        "keywords": ["negocio", "empresa", "local"],
    },
    "sin presencia digital": {
        "has_website": False,
        "signals": ["no_website", "no_social_media", "no_google_business"],
    },
    "web vieja": {
        "signals": ["outdated_website", "old_cms"],
        "keywords": ["empresa"],
    },
    "web obsoleta": {
        "signals": ["outdated_website", "old_cms"],
        "keywords": ["empresa"],
    },
    "web lenta": {
        "signals": ["slow_website", "poor_performance"],
    },
    "sin seo": {
        "signals": ["no_seo", "poor_seo"],
    },
    "seo bajo": {
        "signals": ["poor_seo"],
    },
    "mala velocidad": {
        "signals": ["slow_website", "poor_performance"],
    },
    "sin google business": {
        "signals": ["no_google_business"],
    },
    "sin resenas": {
        "signals": ["no_reviews"],
        "min_reviews": 0,
        "max_reviews": 5,
    },
    "malas resenas": {
        "signals": ["low_reviews", "negative_reviews"],
    },
    "pocas resenas": {
        "signals": ["few_reviews"],
        "max_reviews": 10,
    },
    "sin e-commerce": {
        "signals": ["no_ecommerce"],
    },
    "sin whatsapp": {
        "signals": ["no_whatsapp"],
    },
    "sin chatbot": {
        "signals": ["no_chatbot"],
    },
    "sin crm": {
        "signals": ["no_crm"],
    },
    "sin ia": {
        "signals": ["no_ai", "no_automation"],
    },
    "automatizar procesos": {
        "signals": ["manual_processes", "no_automation"],
    },
    "con ia": {
        "signals": ["uses_ai"],
    },
}


class IntentParser:
    """Parses natural language intent into structured search rules."""

    def parse(self, intent_text: str) -> SearchRules:
        """Parse natural language intent into search rules."""
        intent_lower = intent_text.lower().strip()
        rules = SearchRules()

        # Check direct keyword matches
        matched = False
        for pattern, mapping in INTENT_MAPPINGS.items():
            if pattern in intent_lower:
                matched = True
                if "has_website" in mapping:
                    rules.has_website = mapping["has_website"]
                if "signals" in mapping:
                    rules.signals.extend(mapping["signals"])
                if "keywords" in mapping:
                    rules.keywords.extend(mapping["keywords"])
                if "industries" in mapping:
                    rules.industries.extend(mapping["industries"])
                if "min_reviews" in mapping:
                    rules.min_reviews = mapping["min_reviews"]
                if "max_reviews" in mapping:
                    rules.max_reviews = mapping["max_reviews"]

        # Extract industry mentions
        industry_keywords = {
            "restaurante": "Gastronomia",
            "gastronomia": "Gastronomia",
            "hotel": "Hoteleria",
            "hoteleria": "Hoteleria",
            "construccion": "Construccion",
            "salud": "Salud",
            "clinica": "Salud",
            "dental": "Salud",
            "legal": "Legal",
            "abogado": "Legal",
            "estudio juridico": "Legal",
            "educacion": "Educacion",
            "transporte": "Logistica",
            "logistica": "Logistica",
            "marketing": "Marketing",
            "tecnologia": "Tecnologia",
            "retail": "Retail",
            "comercio": "Retail",
            "supermercado": "Retail",
        }

        for keyword, industry in industry_keywords.items():
            if keyword in intent_lower and industry not in rules.industries:
                rules.industries.append(industry)

        # If no specific rules matched, use keywords from the text
        if not matched and not rules.keywords:
            # Extract meaningful words (remove common stop words)
            stop_words = {
                "que", "necesiten", "necesita", "con", "sin", "para", "por",
                "una", "un", "el", "la", "los", "las", "de", "del", "al",
                "sean", "tengan", "que", "puedan", "empresa", "empresas",
                "negocio", "negocios", "sitio", "web", "pagina",
            }
            words = intent_lower.split()
            keywords = [w for w in words if w not in stop_words and len(w) > 2]
            rules.keywords = keywords

        # Deduplicate
        rules.signals = list(set(rules.signals))
        rules.keywords = list(set(rules.keywords))
        rules.industries = list(set(rules.industries))

        logger.info(
            "intent_parsed",
            intent=intent_text,
            signals=rules.signals,
            industries=rules.industries,
        )

        return rules


# Singleton
_parser: IntentParser | None = None


def get_intent_parser() -> IntentParser:
    global _parser
    if _parser is None:
        _parser = IntentParser()
    return _parser
