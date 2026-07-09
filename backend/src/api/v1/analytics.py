"""
Analytics API routes.
"""
from __future__ import annotations

from fastapi import APIRouter

from src.api.dependencies import CurrentUser, DBSession
from src.application.analytics.use_cases import AnalyticsUseCases

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_overview(user: CurrentUser, session: DBSession):
    use_cases = AnalyticsUseCases(session, user.tenant_id)
    return await use_cases.get_overview()


@router.get("/pipeline")
async def get_pipeline_analytics(user: CurrentUser, session: DBSession):
    use_cases = AnalyticsUseCases(session, user.tenant_id)
    return await use_cases.get_pipeline_analytics()


@router.get("/campaigns")
async def get_campaign_performance(user: CurrentUser, session: DBSession):
    use_cases = AnalyticsUseCases(session, user.tenant_id)
    return await use_cases.get_campaign_performance()


@router.get("/geo")
async def get_geo_distribution(user: CurrentUser, session: DBSession):
    use_cases = AnalyticsUseCases(session, user.tenant_id)
    return await use_cases.get_geo_distribution()


@router.get("/industries")
async def get_industry_breakdown(user: CurrentUser, session: DBSession):
    use_cases = AnalyticsUseCases(session, user.tenant_id)
    return await use_cases.get_industry_breakdown()


@router.get("/roi")
async def get_roi(user: CurrentUser, session: DBSession):
    use_cases = AnalyticsUseCases(session, user.tenant_id)
    return await use_cases.get_roi()
