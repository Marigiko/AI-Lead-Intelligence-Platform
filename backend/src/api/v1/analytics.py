from fastapi import APIRouter, HTTPException

from src.api.dependencies import CurrentUser, DBSession
from src.application.analytics.use_cases import AnalyticsUseCases

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_overview(user: CurrentUser, session: DBSession):
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant access required")
    use_cases = AnalyticsUseCases(session, user.tenant_id)
    return await use_cases.get_overview()


@router.get("/pipeline")
async def get_pipeline_analytics(user: CurrentUser, session: DBSession):
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant access required")
    use_cases = AnalyticsUseCases(session, user.tenant_id)
    return await use_cases.get_pipeline_analytics()


@router.get("/campaigns")
async def get_campaign_performance(user: CurrentUser, session: DBSession):
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant access required")
    use_cases = AnalyticsUseCases(session, user.tenant_id)
    return await use_cases.get_campaign_performance()


@router.get("/geo")
async def get_geo_distribution(user: CurrentUser, session: DBSession):
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant access required")
    use_cases = AnalyticsUseCases(session, user.tenant_id)
    return await use_cases.get_geo_distribution()


@router.get("/industries")
async def get_industry_breakdown(user: CurrentUser, session: DBSession):
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant access required")
    use_cases = AnalyticsUseCases(session, user.tenant_id)
    return await use_cases.get_industry_breakdown()


@router.get("/roi")
async def get_roi(user: CurrentUser, session: DBSession):
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant access required")
    use_cases = AnalyticsUseCases(session, user.tenant_id)
    return await use_cases.get_roi()
