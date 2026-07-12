from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select

from src.domain.user.models import User
from src.domain.user.repository import UserRepository

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


class SQLAlchemyUserRepository(UserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self._session.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def update(self, user: User) -> User:
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def list_by_tenant(self, tenant_id: UUID) -> list[User]:
        stmt = select(User).where(User.tenant_id == tenant_id)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def delete(self, user_id: UUID) -> None:
        user = await self.get_by_id(user_id)
        if user:
            await self._session.delete(user)
            await self._session.flush()
