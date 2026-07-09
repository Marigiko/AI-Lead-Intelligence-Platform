from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.tenant.models import Tenant
from src.domain.tenant.repository import TenantRepository


class SQLAlchemyTenantRepository(TenantRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, tenant_id: UUID) -> Tenant | None:
        return await self._session.get(Tenant, tenant_id)

    async def get_by_slug(self, slug: str) -> Tenant | None:
        stmt = select(Tenant).where(Tenant.slug == slug)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, tenant: Tenant) -> Tenant:
        self._session.add(tenant)
        await self._session.flush()
        await self._session.refresh(tenant)
        return tenant

    async def update(self, tenant: Tenant) -> Tenant:
        await self._session.flush()
        await self._session.refresh(tenant)
        return tenant

    async def delete(self, tenant_id: UUID) -> None:
        tenant = await self.get_by_id(tenant_id)
        if tenant:
            await self._session.delete(tenant)
            await self._session.flush()
