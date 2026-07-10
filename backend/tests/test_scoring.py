"""
Tests for scoring engine and analytics use cases.
"""

import pytest


def test_scoring_engine_web_presence():
    from src.application.scoring.engine import ScoringEngine

    engine = ScoringEngine()
    data = {
        "domain": "example.com",
        "has_ssl": True,
        "google_place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    }
    breakdown = engine.calculate_score(data)
    assert breakdown.web_presence > 0
    assert 0 <= breakdown.total <= 100


def test_scoring_engine_minimal_data():
    from src.application.scoring.engine import ScoringEngine

    engine = ScoringEngine()
    data = {"domain": "", "has_ssl": False, "google_place_id": None}
    breakdown = engine.calculate_score(data)
    assert breakdown.total >= 0


def test_scoring_engine_social_signals():
    from src.application.scoring.engine import ScoringEngine

    engine = ScoringEngine()
    data = {
        "linkedin_url": "https://linkedin.com/company/test",
        "facebook_url": "https://facebook.com/test",
        "domain": "test.com",
    }
    breakdown = engine.calculate_score(data)
    assert breakdown.social > 0


def test_scoring_breakdown_to_dict():
    from src.application.scoring.engine import ScoreBreakdown

    breakdown = ScoreBreakdown(web_presence=20, seo=15, total=50)
    result = breakdown.to_dict()
    assert result["web_presence"] == 20
    assert result["total"] == 50
    assert len(result) == 6


def test_scoring_engine_singleton():
    from src.application.scoring.engine import get_scoring_engine

    engine1 = get_scoring_engine()
    engine2 = get_scoring_engine()
    assert engine1 is engine2


@pytest.mark.anyio
async def test_score_company_endpoint(authenticated_client):
    create_resp = await authenticated_client.post(
        "/api/v1/companies",
        json={"name": "Score Test Co", "domain": "scoretest.com"},
    )
    company_id = create_resp.json()["id"]

    response = await authenticated_client.get(
        f"/api/v1/companies/{company_id}/score"
    )
    assert response.status_code == 200
    assert "score" in response.json()
