from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.tenant.models import Tenant


class TenantRepository(ABC):
    @abstractmethod
    async def get_by_id(self, tenant_id: UUID) -> Tenant | None: ...

    @abstractmethod
    async def get_by_slug(self, slug: str) -> Tenant | None: ...

    @abstractmethod
    async def create(self, tenant: Tenant) -> Tenant: ...

    @abstractmethod
    async def update(self, tenant: Tenant) -> Tenant: ...

    @abstractmethod
    async def delete(self, tenant_id: UUID) -> None: ...
