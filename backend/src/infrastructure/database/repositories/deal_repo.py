from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import func, select

from src.domain.deal.models import Activity, Deal, PipelineStage
from src.domain.deal.repository import (
    ActivityRepository,
    DealRepository,
    PipelineStageRepository,
)

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


class SQLAlchemyDealRepository(DealRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, deal_id: UUID) -> Deal | None:
        return await self._session.get(Deal, deal_id)

    async def create(self, deal: Deal) -> Deal:
        self._session.add(deal)
        await self._session.flush()
        await self._session.refresh(deal)
        return deal

    async def update(self, deal: Deal) -> Deal:
        await self._session.flush()
        await self._session.refresh(deal)
        return deal

    async def delete(self, deal_id: UUID) -> None:
        deal = await self.get_by_id(deal_id)
        if deal:
            await self._session.delete(deal)
            await self._session.flush()

    async def list_by_tenant(
        self, tenant_id: UUID, *, stage: str | None = None, offset: int = 0, limit: int = 50
    ) -> tuple[list[Deal], int]:
        base = select(Deal).where(Deal.tenant_id == tenant_id)
        if stage:
            base = base.where(Deal.stage == stage)
        count = (
            await self._session.execute(select(func.count()).select_from(base.subquery()))
        ).scalar() or 0
        stmt = base.order_by(Deal.updated_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), count

    async def get_pipeline_view(self, tenant_id: UUID) -> dict[str, list[Deal]]:
        stmt = (
            select(Deal)
            .where(Deal.tenant_id == tenant_id)
            .order_by(Deal.stage, Deal.updated_at.desc())
        )
        result = await self._session.execute(stmt)
        deals = list(result.scalars().all())

        pipeline: dict[str, list[Deal]] = {}
        for deal in deals:
            if deal.stage not in pipeline:
                pipeline[deal.stage] = []
            pipeline[deal.stage].append(deal)
        return pipeline

    async def get_pipeline_stats(self, tenant_id: UUID) -> dict[str, Any]:
        # Aggregate in one pass; won/lost come from the tenant's stage config
        # (is_won/is_lost flags) instead of hardcoded stage names.
        sq = (
            select(Deal.value, PipelineStage.is_won, PipelineStage.is_lost)
            .join(
                PipelineStage,
                (PipelineStage.tenant_id == Deal.tenant_id) & (PipelineStage.name == Deal.stage),
                isouter=True,
            )
            .where(Deal.tenant_id == tenant_id)
            .subquery()
        )

        row = (
            await self._session.execute(
                select(
                    func.count(),
                    func.coalesce(func.sum(sq.c.value), 0),
                    func.count().filter(sq.c.is_won.is_(True)),
                    func.coalesce(func.sum(sq.c.value).filter(sq.c.is_won.is_(True)), 0),
                    func.count().filter(sq.c.is_lost.is_(True)),
                )
            )
        ).one()

        total = row[0]
        won_count = row[2]

        return {
            "total_deals": total,
            "total_value": float(row[1]),
            "won_deals": won_count,
            "won_value": float(row[3]),
            "lost_deals": row[4],
            "win_rate": (won_count / total * 100) if total > 0 else 0,
        }


class SQLAlchemyActivityRepository(ActivityRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, activity: Activity) -> Activity:
        self._session.add(activity)
        await self._session.flush()
        await self._session.refresh(activity)
        return activity

    async def list_by_deal(self, deal_id: UUID, *, limit: int = 50) -> list[Activity]:
        stmt = (
            select(Activity)
            .where(Activity.deal_id == deal_id)
            .order_by(Activity.created_at.desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_tenant(self, tenant_id: UUID, *, limit: int = 50) -> list[Activity]:
        stmt = (
            select(Activity)
            .where(Activity.tenant_id == tenant_id)
            .order_by(Activity.created_at.desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class SQLAlchemyPipelineStageRepository(PipelineStageRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, stage_id: UUID) -> PipelineStage | None:
        return await self._session.get(PipelineStage, stage_id)

    async def create(self, stage: PipelineStage) -> PipelineStage:
        self._session.add(stage)
        await self._session.flush()
        await self._session.refresh(stage)
        return stage

    async def list_by_tenant(self, tenant_id: UUID) -> list[PipelineStage]:
        stmt = (
            select(PipelineStage)
            .where(PipelineStage.tenant_id == tenant_id)
            .order_by(PipelineStage.order)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, stage: PipelineStage) -> PipelineStage:
        await self._session.flush()
        await self._session.refresh(stage)
        return stage

    async def delete(self, stage_id: UUID) -> None:
        stage = await self.get_by_id(stage_id)
        if stage:
            await self._session.delete(stage)
            await self._session.flush()
