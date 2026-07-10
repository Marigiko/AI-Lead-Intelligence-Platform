from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from uuid import UUID

    from src.domain.campaign.models import Campaign, CampaignLead, MessageTemplate


class CampaignRepository(ABC):
    @abstractmethod
    async def get_by_id(self, campaign_id: UUID) -> Campaign | None: ...

    @abstractmethod
    async def create(self, campaign: Campaign) -> Campaign: ...

    @abstractmethod
    async def update(self, campaign: Campaign) -> Campaign: ...

    @abstractmethod
    async def delete(self, campaign_id: UUID) -> None: ...

    @abstractmethod
    async def list_by_tenant(
        self, tenant_id: UUID, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[Campaign], int]: ...


class CampaignLeadRepository(ABC):
    @abstractmethod
    async def create(self, lead: CampaignLead) -> CampaignLead: ...

    @abstractmethod
    async def bulk_create(self, leads: list[CampaignLead]) -> list[CampaignLead]: ...

    @abstractmethod
    async def list_by_campaign(
        self, campaign_id: UUID, *, status: str | None = None, limit: int = 100
    ) -> list[CampaignLead]: ...

    @abstractmethod
    async def update(self, lead: CampaignLead) -> CampaignLead: ...

    @abstractmethod
    async def get_by_tracking_id(self, tracking_id: str) -> CampaignLead | None: ...

    @abstractmethod
    async def get_campaign_stats(self, campaign_id: UUID) -> dict[str, int]: ...


class MessageTemplateRepository(ABC):
    @abstractmethod
    async def get_by_id(self, template_id: UUID) -> MessageTemplate | None: ...

    @abstractmethod
    async def create(self, template: MessageTemplate) -> MessageTemplate: ...

    @abstractmethod
    async def list_by_tenant(self, tenant_id: UUID) -> list[MessageTemplate]: ...

    @abstractmethod
    async def delete(self, template_id: UUID) -> None: ...
