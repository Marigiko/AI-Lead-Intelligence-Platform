from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import func, or_, select

from src.domain.company.models import Company, CompanySource
from src.domain.company.repository import CompanyRepository, CompanySourceRepository

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


class SQLAlchemyCompanyRepository(CompanyRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, company_id: UUID) -> Company | None:
        return await self._session.get(Company, company_id)

    async def get_by_domain(self, tenant_id: UUID, domain: str) -> Company | None:
        stmt = select(Company).where(
            Company.tenant_id == tenant_id,
            Company.domain == domain,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, company: Company) -> Company:
        self._session.add(company)
        await self._session.flush()
        await self._session.refresh(company)
        return company

    async def update(self, company: Company) -> Company:
        await self._session.flush()
        await self._session.refresh(company)
        return company

    async def delete(self, company_id: UUID) -> None:
        company = await self.get_by_id(company_id)
        if company:
            await self._session.delete(company)
            await self._session.flush()

    async def list_by_tenant(
        self,
        tenant_id: UUID,
        *,
        offset: int = 0,
        limit: int = 20,
        filters: dict[str, Any] | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[Company], int]:
        base = select(Company).where(Company.tenant_id == tenant_id)

        # Apply filters
        if filters:
            if "status" in filters:
                base = base.where(Company.status == filters["status"])
            if "industry" in filters:
                base = base.where(Company.industry == filters["industry"])
            if "city" in filters:
                base = base.where(Company.city == filters["city"])
            if "min_score" in filters:
                base = base.where(Company.opportunity_score >= filters["min_score"])
            if "has_website" in filters:
                if filters["has_website"]:
                    base = base.where(Company.domain.isnot(None))
                else:
                    base = base.where(Company.domain.is_(None))
            if "search" in filters:
                search = f"%{filters['search']}%"
                base = base.where(
                    or_(
                        Company.name.ilike(search),
                        Company.industry.ilike(search),
                        Company.city.ilike(search),
                    )
                )

        # Count total
        count_stmt = select(func.count()).select_from(base.subquery())
        total = (await self._session.execute(count_stmt)).scalar() or 0

        # Sort
        sort_col = getattr(Company, sort_by, Company.created_at)
        if sort_order == "asc":
            base = base.order_by(sort_col.asc())
        else:
            base = base.order_by(sort_col.desc())

        # Paginate
        base = base.offset(offset).limit(limit)
        result = await self._session.execute(base)
        companies = list(result.scalars().all())

        return companies, total

    async def search(self, tenant_id: UUID, query: str, *, limit: int = 20) -> list[Company]:
        search = f"%{query}%"
        stmt = (
            select(Company)
            .where(
                Company.tenant_id == tenant_id,
                or_(
                    Company.name.ilike(search),
                    Company.industry.ilike(search),
                    Company.city.ilike(search),
                    Company.domain.ilike(search),
                ),
            )
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_duplicates(
        self, tenant_id: UUID, name: str, domain: str | None, city: str | None
    ) -> list[Company]:
        or_expr = Company.name.ilike(f"%{name}%")
        if domain:
            or_expr = or_expr | (Company.domain == domain)
        if city:
            or_expr = or_expr | Company.city.ilike(f"%{city}%")
        stmt = select(Company).where(Company.tenant_id == tenant_id).where(or_expr).limit(10)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class SQLAlchemyCompanySourceRepository(CompanySourceRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, source: CompanySource) -> CompanySource:
        self._session.add(source)
        await self._session.flush()
        await self._session.refresh(source)
        return source

    async def list_by_company(self, company_id: UUID) -> list[CompanySource]:
        stmt = select(CompanySource).where(CompanySource.company_id == company_id)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_existing(
        self, company_id: UUID, source: str, source_id: str | None = None
    ) -> CompanySource | None:
        conditions = [
            CompanySource.company_id == company_id,
            CompanySource.source == source,
        ]
        if source_id:
            conditions.append(CompanySource.source_id == source_id)
        stmt = select(CompanySource).where(*conditions)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()
