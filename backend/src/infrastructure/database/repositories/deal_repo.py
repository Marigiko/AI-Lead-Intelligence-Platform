from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.deal.models import Activity, Deal, PipelineStage
from src.domain.deal.repository import (
    ActivityRepository,
    DealRepository,
    PipelineStageRepository,
)


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
        count = (await self._session.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
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
        base = select(Deal).where(Deal.tenant_id == tenant_id)

        total = (await self._session.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
        total_value = (await self._session.execute(
            select(func.coalesce(func.sum(Deal.value), 0)).select_from(base.subquery())
        )).scalar() or 0
        won_count = (await self._session.execute(
            select(func.count()).select_from(base.where(Deal.stage == "won").subquery())
        )).scalar() or 0
        won_value = (await self._session.execute(
            select(func.coalesce(func.sum(Deal.value), 0)).select_from(
                base.where(Deal.stage == "won").subquery()
            )
        )).scalar() or 0
        lost_count = (await self._session.execute(
            select(func.count()).select_from(base.where(Deal.stage == "lost").subquery())
        )).scalar() or 0

        return {
            "total_deals": total,
            "total_value": float(total_value),
            "won_deals": won_count,
            "won_value": float(won_value),
            "lost_deals": lost_count,
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
