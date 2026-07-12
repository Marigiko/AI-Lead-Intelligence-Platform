import contextlib
from typing import Any

from fastapi import APIRouter

from src.api.dependencies import CurrentUser, OptionalUser
from src.application.scoring.engine import get_scoring_engine
from src.infrastructure.scraping.seo_analyzer import get_seo_analyzer
from src.infrastructure.scraping.social_detector import get_social_detector
from src.infrastructure.scraping.tech_detector import get_tech_detector

router = APIRouter(prefix="/scoring", tags=["Scoring"])


@router.get("/rules")
async def get_scoring_rules(user: CurrentUser):  # noqa: ARG001
    """Get current scoring rules and weights."""
    get_scoring_engine()
    return {
        "rules": {
            "web_presence": {"max_points": 25, "description": "Website presence and quality"},
            "seo": {"max_points": 25, "description": "Search engine optimization"},
            "social": {"max_points": 15, "description": "Social media presence"},
            "automation": {"max_points": 20, "description": "Business automation level"},
            "technical": {"max_points": 15, "description": "Technical infrastructure"},
        },
        "total_max": 100,
    }


@router.post("/preview")
async def preview_score(
    domain: str | None = None,
    user: OptionalUser = None,  # noqa: ARG001
):
    """Preview opportunity score for a domain (without saving)."""
    if not domain:
        return {"error": "Domain required"}

    url = f"https://{domain}"
    engine = get_scoring_engine()
    tech_detector = get_tech_detector()
    seo_analyzer = get_seo_analyzer()
    social_detector = get_social_detector()

    # Quick analysis
    data: dict[str, Any] = {"domain": domain}

    with contextlib.suppress(Exception):
        tech = await tech_detector.detect(url)
        data["tech_stack"] = tech.technologies
        data["has_ssl"] = tech.has_ssl
        data["has_chatbot"] = tech.has_chatbot
        data["has_crm"] = tech.has_crm
        data["has_ecommerce"] = tech.has_ecommerce
        data["has_whatsapp"] = tech.has_whatsapp

    with contextlib.suppress(Exception):
        seo = await seo_analyzer.analyze(url)
        data["seo_score"] = seo.score

    with contextlib.suppress(Exception):
        social = await social_detector.detect(url)
        data["facebook_url"] = social.facebook_url
        data["instagram_url"] = social.instagram_url
        data["linkedin_url"] = social.linkedin_url

    breakdown = engine.calculate_score(data)
    recommendations = engine.get_recommendations(data, breakdown)

    return {
        "domain": domain,
        "score": breakdown.total,
        "breakdown": breakdown.to_dict(),
        "recommendations": recommendations,
    }
