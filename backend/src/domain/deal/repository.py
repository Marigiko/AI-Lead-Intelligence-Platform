from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from uuid import UUID

    from src.domain.deal.models import Activity, Deal, PipelineStage


class DealRepository(ABC):
    @abstractmethod
    async def get_by_id(self, deal_id: UUID) -> Deal | None: ...

    @abstractmethod
    async def create(self, deal: Deal) -> Deal: ...

    @abstractmethod
    async def update(self, deal: Deal) -> Deal: ...

    @abstractmethod
    async def delete(self, deal_id: UUID) -> None: ...

    @abstractmethod
    async def list_by_tenant(
        self, tenant_id: UUID, *, stage: str | None = None, offset: int = 0, limit: int = 50
    ) -> tuple[list[Deal], int]: ...

    @abstractmethod
    async def get_pipeline_view(self, tenant_id: UUID) -> dict[str, list[Deal]]: ...

    @abstractmethod
    async def get_pipeline_stats(self, tenant_id: UUID) -> dict[str, Any]: ...


class ActivityRepository(ABC):
    @abstractmethod
    async def create(self, activity: Activity) -> Activity: ...

    @abstractmethod
    async def list_by_deal(self, deal_id: UUID, *, limit: int = 50) -> list[Activity]: ...

    @abstractmethod
    async def list_by_tenant(self, tenant_id: UUID, *, limit: int = 50) -> list[Activity]: ...


class PipelineStageRepository(ABC):
    @abstractmethod
    async def get_by_id(self, stage_id: UUID) -> PipelineStage | None: ...

    @abstractmethod
    async def create(self, stage: PipelineStage) -> PipelineStage: ...

    @abstractmethod
    async def list_by_tenant(self, tenant_id: UUID) -> list[PipelineStage]: ...

    @abstractmethod
    async def update(self, stage: PipelineStage) -> PipelineStage: ...

    @abstractmethod
    async def delete(self, stage_id: UUID) -> None: ...
