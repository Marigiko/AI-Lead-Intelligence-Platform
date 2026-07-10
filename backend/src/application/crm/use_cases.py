"""
CRM application use cases.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import structlog

from src.domain.deal.models import Activity, Deal, PipelineStage
from src.infrastructure.database.repositories.deal_repo import (
    SQLAlchemyActivityRepository,
    SQLAlchemyDealRepository,
    SQLAlchemyPipelineStageRepository,
)

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

    from src.domain.deal.repository import (
        ActivityRepository,
        DealRepository,
        PipelineStageRepository,
    )

logger = structlog.get_logger()

# Default pipeline stages
DEFAULT_STAGES = [
    {"name": "Prospeccion", "order": 1, "probability": 10, "color": "#94a3b8"},
    {"name": "Contacto", "order": 2, "probability": 20, "color": "#60a5fa"},
    {"name": "Calificado", "order": 3, "probability": 40, "color": "#a78bfa"},
    {"name": "Propuesta", "order": 4, "probability": 60, "color": "#fbbf24"},
    {"name": "Negociacion", "order": 5, "probability": 80, "color": "#f97316"},
    {"name": "Ganado", "order": 6, "probability": 100, "color": "#22c55e", "is_won": True},
    {"name": "Perdido", "order": 7, "probability": 0, "color": "#ef4444", "is_lost": True},
]


class CRMUseCases:
    def __init__(self, session: AsyncSession, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id
        self._deal_repo: DealRepository = SQLAlchemyDealRepository(session)
        self._activity_repo: ActivityRepository = SQLAlchemyActivityRepository(session)
        self._stage_repo: PipelineStageRepository = SQLAlchemyPipelineStageRepository(session)

    async def ensure_default_stages(self) -> None:
        """Create default pipeline stages if none exist."""
        existing = await self._stage_repo.list_by_tenant(self._tenant_id)
        if not existing:
            for stage_data in DEFAULT_STAGES:
                stage = PipelineStage(
                    tenant_id=self._tenant_id,
                    **stage_data,
                )
                await self._stage_repo.create(stage)
            await self._session.commit()

    async def get_pipeline(self) -> dict[str, Any]:
        """Get full pipeline view with stages and deals."""
        await self.ensure_default_stages()

        stages = await self._stage_repo.list_by_tenant(self._tenant_id)
        pipeline: dict[str, list[Deal]] = await self._deal_repo.get_pipeline_view(self._tenant_id)

        stage_views: list[dict[str, Any]] = []
        for stage in stages:
            deals_in_stage = pipeline.get(stage.name, [])
            stage_views.append(
                {
                    "id": str(stage.id),
                    "name": stage.name,
                    "order": stage.order,
                    "probability": stage.probability,
                    "color": stage.color,
                    "is_won": stage.is_won,
                    "is_lost": stage.is_lost,
                    "deal_count": len(deals_in_stage),
                    "total_value": sum(d.value or 0 for d in deals_in_stage),
                    "deals": [
                        {
                            "id": str(d.id),
                            "title": d.title,
                            "value": d.value,
                            "currency": d.currency,
                            "probability": d.probability,
                            "company_id": str(d.company_id) if d.company_id else None,
                            "expected_close_date": str(d.expected_close_date)
                            if d.expected_close_date
                            else None,
                            "created_at": str(d.created_at),
                        }
                        for d in deals_in_stage
                    ],
                }
            )

        stats: dict[str, Any] = await self._deal_repo.get_pipeline_stats(self._tenant_id)

        return {"stages": stage_views, "stats": stats}

    async def create_deal(self, data: dict[str, Any]) -> dict[str, Any]:
        """Create a new deal."""
        deal = Deal(
            tenant_id=self._tenant_id,
            title=data["title"],
            value=data.get("value"),
            currency=data.get("currency", "USD"),
            stage=data.get("stage", "Prospeccion"),
            probability=data.get("probability", 10),
            company_id=data.get("company_id"),
            contact_id=data.get("contact_id"),
            conversation_id=data.get("conversation_id"),
            expected_close_date=data.get("expected_close_date"),
            notes=data.get("notes"),
            tags=data.get("tags"),
            services=data.get("services"),
        )
        deal = await self._deal_repo.create(deal)

        # Log activity
        activity = Activity(
            tenant_id=self._tenant_id,
            deal_id=deal.id,
            company_id=deal.company_id,
            type="deal_created",
            title=f"Negocio creado: {deal.title}",
            content=f"Valor: {deal.value} {deal.currency}" if deal.value else None,
        )
        await self._activity_repo.create(activity)
        await self._session.commit()

        return {
            "id": str(deal.id),
            "title": deal.title,
            "value": deal.value,
            "stage": deal.stage,
        }

    async def update_deal(self, deal_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
        """Update a deal."""
        deal = await self._deal_repo.get_by_id(deal_id)
        if not deal or deal.tenant_id != self._tenant_id:
            return {"error": "Deal not found"}

        old_stage = deal.stage

        for field in [
            "title",
            "value",
            "currency",
            "probability",
            "notes",
            "tags",
            "services",
            "lost_reason",
        ]:
            if field in data:
                setattr(deal, field, data[field])
        if "stage" in data:
            deal.stage = data["stage"]
        if "expected_close_date" in data:
            deal.expected_close_date = data["expected_close_date"]

        deal = await self._deal_repo.update(deal)

        # Log stage change
        if "stage" in data and data["stage"] != old_stage:
            activity = Activity(
                tenant_id=self._tenant_id,
                deal_id=deal.id,
                company_id=deal.company_id,
                type="status_change",
                title=f"Etapa cambiada: {old_stage} → {deal.stage}",
            )
            await self._activity_repo.create(activity)

        await self._session.commit()
        return {"id": str(deal.id), "stage": deal.stage}

    async def move_deal(self, deal_id: UUID, new_stage: str) -> dict[str, Any]:
        """Move deal to a new stage (Kanban drag & drop)."""
        return await self.update_deal(deal_id, {"stage": new_stage})

    async def add_note(self, deal_id: UUID, content: str) -> dict[str, Any]:
        """Add a note to a deal."""
        deal = await self._deal_repo.get_by_id(deal_id)
        if not deal or deal.tenant_id != self._tenant_id:
            return {"error": "Deal not found"}

        activity = Activity(
            tenant_id=self._tenant_id,
            deal_id=deal.id,
            company_id=deal.company_id,
            type="note",
            title="Nota",
            content=content,
        )
        await self._activity_repo.create(activity)
        await self._session.commit()

        return {"id": str(activity.id), "type": "note"}

    async def get_activity_timeline(self, deal_id: UUID) -> list[dict[str, Any]]:
        """Get activity timeline for a deal."""
        activities = await self._activity_repo.list_by_deal(deal_id)
        return [
            {
                "id": str(a.id),
                "type": a.type,
                "title": a.title,
                "content": a.content,
                "created_at": str(a.created_at),
            }
            for a in activities
        ]

    async def get_recent_activity(self, limit: int = 20) -> list[dict[str, Any]]:
        """Get recent activity across all deals."""
        activities = await self._activity_repo.list_by_tenant(self._tenant_id, limit=limit)
        return [
            {
                "id": str(a.id),
                "type": a.type,
                "title": a.title,
                "content": a.content,
                "deal_id": str(a.deal_id) if a.deal_id else None,
                "created_at": str(a.created_at),
            }
            for a in activities
        ]

    async def get_stats(self) -> dict[str, Any]:
        """Get CRM statistics."""
        return await self._deal_repo.get_pipeline_stats(self._tenant_id)
