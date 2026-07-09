from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.user.models import User


class UserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def create(self, user: User) -> User: ...

    @abstractmethod
    async def update(self, user: User) -> User: ...

    @abstractmethod
    async def list_by_tenant(self, tenant_id: UUID) -> list[User]: ...

    @abstractmethod
    async def delete(self, user_id: UUID) -> None: ...
