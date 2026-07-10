from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from uuid import UUID

    from src.domain.company.models import Company, CompanySource


class CompanyRepository(ABC):
    @abstractmethod
    async def get_by_id(self, company_id: UUID) -> Company | None: ...

    @abstractmethod
    async def get_by_domain(self, tenant_id: UUID, domain: str) -> Company | None: ...

    @abstractmethod
    async def create(self, company: Company) -> Company: ...

    @abstractmethod
    async def update(self, company: Company) -> Company: ...

    @abstractmethod
    async def delete(self, company_id: UUID) -> None: ...

    @abstractmethod
    async def list_by_tenant(
        self,
        tenant_id: UUID,
        *,
        offset: int = 0,
        limit: int = 20,
        filters: dict[str, Any] | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[Company], int]: ...

    @abstractmethod
    async def search(self, tenant_id: UUID, query: str, *, limit: int = 20) -> list[Company]: ...

    @abstractmethod
    async def find_duplicates(
        self, tenant_id: UUID, name: str, domain: str | None, city: str | None
    ) -> list[Company]: ...


class CompanySourceRepository(ABC):
    @abstractmethod
    async def create(self, source: CompanySource) -> CompanySource: ...

    @abstractmethod
    async def list_by_company(self, company_id: UUID) -> list[CompanySource]: ...

    @abstractmethod
    async def find_existing(
        self, company_id: UUID, source: str, source_id: str | None = None
    ) -> CompanySource | None: ...
