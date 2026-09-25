"""
Analytics application use cases.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

from sqlalchemy import and_, func, select

from src.domain.campaign.models import Campaign
from src.domain.company.models import Company
from src.domain.deal.models import Deal

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


class AnalyticsUseCases:
    def __init__(self, session: AsyncSession, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id

    async def get_overview(self) -> dict[str, Any]:
        """Get dashboard overview statistics."""
        now = datetime.now(UTC)
        week_ago = now - timedelta(days=7)

        # Companies
        total_companies = (
            await self._session.execute(
                select(func.count())
                .select_from(Company)
                .where(Company.tenant_id == self._tenant_id)
            )
        ).scalar() or 0

        companies_this_week = (
            await self._session.execute(
                select(func.count())
                .select_from(Company)
                .where(and_(Company.tenant_id == self._tenant_id, Company.created_at >= week_ago))
            )
        ).scalar() or 0

        total_contacts = (
            await self._session.execute(
                select(func.count())
                .select_from(Company)
                .where(
                    and_(
                        Company.tenant_id == self._tenant_id,
                        Company.email.isnot(None),
                    )
                )
            )
        ).scalar() or 0

        avg_score = (
            await self._session.execute(
                select(func.coalesce(func.avg(Company.opportunity_score), 0)).where(
                    Company.tenant_id == self._tenant_id
                )
            )
        ).scalar() or 0

        # Campaigns
        total_campaigns = (
            await self._session.execute(
                select(func.count())
                .select_from(Campaign)
                .where(Campaign.tenant_id == self._tenant_id)
            )
        ).scalar() or 0

        # Deals
        total_deals = (
            await self._session.execute(
                select(func.count()).select_from(Deal).where(Deal.tenant_id == self._tenant_id)
            )
        ).scalar() or 0

        pipeline_value = (
            await self._session.execute(
                select(func.coalesce(func.sum(Deal.value), 0)).where(
                    and_(Deal.tenant_id == self._tenant_id, Deal.stage != "Perdido")
                )
            )
        ).scalar() or 0

        won_value = (
            await self._session.execute(
                select(func.coalesce(func.sum(Deal.value), 0)).where(
                    and_(Deal.tenant_id == self._tenant_id, Deal.stage == "Ganado")
                )
            )
        ).scalar() or 0

        return {
            "total_companies": total_companies,
            "total_contacts": total_contacts,
            "companies_this_week": companies_this_week,
            "avg_opportunity_score": round(float(avg_score)),
            "total_campaigns": total_campaigns,
            "total_deals": total_deals,
            "pipeline_value": float(pipeline_value),
            "won_value": float(won_value),
        }

    async def get_pipeline_analytics(self) -> dict[str, Any]:
        """Get pipeline analytics."""
        stages = [
            "Prospeccion",
            "Contacto",
            "Calificado",
            "Propuesta",
            "Negociacion",
            "Ganado",
            "Perdido",
        ]
        result: list[dict[str, Any]] = []

        for stage in stages:
            count = (
                await self._session.execute(
                    select(func.count())
                    .select_from(Deal)
                    .where(and_(Deal.tenant_id == self._tenant_id, Deal.stage == stage))
                )
            ).scalar() or 0

            value = (
                await self._session.execute(
                    select(func.coalesce(func.sum(Deal.value), 0)).where(
                        and_(Deal.tenant_id == self._tenant_id, Deal.stage == stage)
                    )
                )
            ).scalar() or 0

            result.append({"stage": stage, "count": count, "value": float(value)})

        return {"stages": result}

    async def get_campaign_performance(self) -> dict[str, Any]:
        """Get campaign performance metrics."""
        campaigns = (
            (
                await self._session.execute(
                    select(Campaign)
                    .where(Campaign.tenant_id == self._tenant_id)
                    .order_by(Campaign.created_at.desc())
                    .limit(10)
                )
            )
            .scalars()
            .all()
        )

        result: list[dict[str, Any]] = []
        for c in campaigns:
            stats = c.stats or {}
            sent = stats.get("sent", 0)
            opened = stats.get("opened", 0)
            replied = stats.get("replied", 0)

            result.append(
                {
                    "id": str(c.id),
                    "name": c.name,
                    "type": c.type,
                    "status": c.status,
                    "total": stats.get("total", 0),
                    "sent": sent,
                    "opened": opened,
                    "replied": replied,
                    "open_rate": round((opened / sent * 100) if sent > 0 else 0),
                    "reply_rate": round((replied / sent * 100) if sent > 0 else 0),
                    "created_at": str(c.created_at),
                }
            )

        return {"campaigns": result}

    async def get_geo_distribution(self) -> dict[str, Any]:
        """Get geographic distribution of companies."""
        stmt = (
            select(
                Company.city,
                Company.province,
                func.count().label("count"),
                func.avg(Company.opportunity_score).label("avg_score"),
            )
            .where(
                and_(
                    Company.tenant_id == self._tenant_id,
                    Company.city.isnot(None),
                )
            )
            .group_by(Company.city, Company.province)
            .order_by(func.count().desc())
            .limit(20)
        )
        result = await self._session.execute(stmt)
        rows = result.all()

        return {
            "locations": [
                {
                    "city": row.city,
                    "province": row.province,
                    "count": row.count,
                    "avg_score": round(float(row.avg_score or 0)),
                }
                for row in rows
            ]
        }

    async def get_industry_breakdown(self) -> dict[str, Any]:
        """Get breakdown by industry."""
        stmt = (
            select(
                Company.industry,
                func.count().label("count"),
                func.avg(Company.opportunity_score).label("avg_score"),
            )
            .where(
                and_(
                    Company.tenant_id == self._tenant_id,
                    Company.industry.isnot(None),
                )
            )
            .group_by(Company.industry)
            .order_by(func.count().desc())
        )
        result = await self._session.execute(stmt)
        rows = result.all()

        return {
            "industries": [
                {
                    "industry": row.industry,
                    "count": row.count,
                    "avg_score": round(float(row.avg_score or 0)),
                }
                for row in rows
            ]
        }

    async def get_roi(self) -> dict[str, Any]:
        """Calculate ROI metrics."""
        won_value = (
            await self._session.execute(
                select(func.coalesce(func.sum(Deal.value), 0)).where(
                    and_(Deal.tenant_id == self._tenant_id, Deal.stage == "Ganado")
                )
            )
        ).scalar() or 0

        total_deals = (
            await self._session.execute(
                select(func.count()).select_from(Deal).where(Deal.tenant_id == self._tenant_id)
            )
        ).scalar() or 0

        won_deals = (
            await self._session.execute(
                select(func.count())
                .select_from(Deal)
                .where(and_(Deal.tenant_id == self._tenant_id, Deal.stage == "Ganado"))
            )
        ).scalar() or 0

        total_companies = (
            await self._session.execute(
                select(func.count())
                .select_from(Company)
                .where(Company.tenant_id == self._tenant_id)
            )
        ).scalar() or 0

        # Estimated CAC (simplified)
        estimated_cost = total_companies * 0.5  # $0.50 per company processed
        cac = (estimated_cost / won_deals) if won_deals > 0 else 0

        return {
            "revenue": float(won_value),
            "deals_won": won_deals,
            "deals_total": total_deals,
            "win_rate": round((won_deals / total_deals * 100) if total_deals > 0 else 0),
            "estimated_cost": round(estimated_cost, 2),
            "cac": round(cac, 2),
            "roi": round(
                ((float(won_value) - estimated_cost) / estimated_cost * 100)
                if estimated_cost > 0
                else 0
            ),
        }
