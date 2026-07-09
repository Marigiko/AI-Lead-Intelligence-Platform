"""
Opportunity scoring engine — calculates a score based on multiple signals.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import structlog

logger = structlog.get_logger()


@dataclass
class ScoreBreakdown:
    """Breakdown of the opportunity score."""
    web_presence: int = 0  # 0-25
    seo: int = 0  # 0-25
    social: int = 0  # 0-15
    automation: int = 0  # 0-20
    technical: int = 0  # 0-15
    total: int = 0

    def to_dict(self) -> dict[str, int]:
        return {
            "web_presence": self.web_presence,
            "seo": self.seo,
            "social": self.social,
            "automation": self.automation,
            "technical": self.technical,
            "total": self.total,
        }


class ScoringEngine:
    """Rules-based opportunity scoring engine."""

    def calculate_score(self, company_data: dict[str, Any]) -> ScoreBreakdown:
        """Calculate opportunity score from company data."""
        breakdown = ScoreBreakdown()

        # Web Presence (0-25 points)
        breakdown.web_presence = self._score_web_presence(company_data)

        # SEO (0-25 points)
        breakdown.seo = self._score_seo(company_data)

        # Social Media (0-15 points)
        breakdown.social = self._score_social(company_data)

        # Automation (0-20 points)
        breakdown.automation = self._score_automation(company_data)

        # Technical (0-15 points)
        breakdown.technical = self._score_technical(company_data)

        breakdown.total = (
            breakdown.web_presence
            + breakdown.seo
            + breakdown.social
            + breakdown.automation
            + breakdown.technical
        )

        return breakdown

    def _score_web_presence(self, data: dict) -> int:
        score = 0

        # No website = highest opportunity
        if not data.get("domain"):
            return 25

        # Has website but issues
        if data.get("page_speed_mobile") and data["page_speed_mobile"] < 50:
            score += 8
        elif data.get("page_speed_mobile") and data["page_speed_mobile"] < 70:
            score += 4

        # No Google Business
        if not data.get("google_place_id"):
            score += 5

        # Low Google rating
        rating = data.get("google_rating")
        if rating and rating < 3.5:
            score += 5
        elif rating and rating < 4.0:
            score += 3

        # Few reviews
        reviews = data.get("google_review_count", 0) or 0
        if reviews < 5:
            score += 4
        elif reviews < 20:
            score += 2

        # No domain (already handled above)
        if not data.get("domain"):
            score += 3

        return min(25, score)

    def _score_seo(self, data: dict) -> int:
        score = 0
        seo = data.get("seo_score", 50) or 50

        if seo < 30:
            score = 25
        elif seo < 50:
            score = 20
        elif seo < 70:
            score = 12
        elif seo < 85:
            score = 5

        return score

    def _score_social(self, data: dict) -> int:
        score = 0

        social_profiles = sum(1 for key in [
            "facebook_url", "instagram_url", "linkedin_url", "tiktok_url"
        ] if data.get(key))

        if social_profiles == 0:
            score = 15
        elif social_profiles == 1:
            score = 10
        elif social_profiles == 2:
            score = 5

        return score

    def _score_automation(self, data: dict) -> int:
        score = 0

        # No chatbot
        if not data.get("has_chatbot"):
            score += 7

        # No CRM
        if not data.get("has_crm"):
            score += 7

        # No e-commerce (if applicable industry)
        if not data.get("has_ecommerce"):
            score += 3

        # No WhatsApp business
        if not data.get("has_whatsapp"):
            score += 3

        return min(20, score)

    def _score_technical(self, data: dict) -> int:
        score = 0

        # No SSL
        if not data.get("has_ssl"):
            score += 8

        # Old/outdated technologies
        tech_stack = data.get("tech_stack", [])
        outdated = ["PHP 7", "PHP 5", "WordPress" if data.get("seo_score", 100) < 40 else ""]
        for tech in tech_stack:
            for old in outdated:
                if old and old in str(tech):
                    score += 3
                    break

        return min(15, score)

    def get_recommendations(self, data: dict, breakdown: ScoreBreakdown) -> list[str]:
        """Generate service recommendations based on score breakdown."""
        recommendations = []

        if breakdown.web_presence >= 15:
            if not data.get("domain"):
                recommendations.append("Desarrollo de pagina web")
            else:
                recommendations.append("Rediseño de sitio web")

        if breakdown.seo >= 15:
            recommendations.append("Optimización SEO")

        if breakdown.social >= 10:
            recommendations.append("Gestión de redes sociales")

        if breakdown.automation >= 12:
            if not data.get("has_chatbot"):
                recommendations.append("Implementación de chatbot")
            if not data.get("has_crm"):
                recommendations.append("Implementación de CRM")
            recommendations.append("Automatización de procesos con IA")

        if breakdown.technical >= 10:
            if not data.get("has_ssl"):
                recommendations.append("Instalación de certificado SSL")
            recommendations.append("Modernización tecnológica")

        if not data.get("google_place_id"):
            recommendations.append("Configuración de Google Business")

        return recommendations


# Singleton
_engine: ScoringEngine | None = None


def get_scoring_engine() -> ScoringEngine:
    global _engine
    if _engine is None:
        _engine = ScoringEngine()
    return _engine
