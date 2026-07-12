from __future__ import annotations

from typing import TYPE_CHECKING, Annotated
from uuid import UUID

import structlog
from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.exceptions import ForbiddenError, UnauthorizedError
from src.core.security import TokenPayload, decode_token
from src.domain.user.models import User
from src.infrastructure.database.repositories.user_repo import SQLAlchemyUserRepository

logger = structlog.get_logger()

if TYPE_CHECKING:
    from src.domain.user.repository import UserRepository


async def get_user_repo(session: AsyncSession = Depends(get_db)) -> UserRepository:  # noqa: B008
    return SQLAlchemyUserRepository(session)


async def get_current_token(authorization: str = Header(...)) -> TokenPayload:
    if not authorization.startswith("Bearer "):
        raise UnauthorizedError("Invalid authorization header")
    token = authorization[7:]
    payload = decode_token(token)
    if not payload or payload.type.value != "access":
        raise UnauthorizedError("Invalid or expired token")
    return payload


async def get_current_user(
    token: Annotated[TokenPayload, Depends(get_current_token)],
    user_repo: UserRepository = Depends(get_user_repo),  # noqa: B008
) -> User:
    user = await user_repo.get_by_id(UUID(token.sub))
    if not user or not user.is_active:
        raise UnauthorizedError("User not found or inactive")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DBSession = Annotated[AsyncSession, Depends(get_db)]


async def get_optional_user(
    authorization: Annotated[str | None, Header(description="Bearer token")] = None,
) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        from uuid import UUID

        from src.core.database import get_session_factory

        token = authorization[7:]
        payload = decode_token(token)
        if not payload:
            return None
        factory = get_session_factory()
        async with factory() as session:
            repo = SQLAlchemyUserRepository(session)
            user = await repo.get_by_id(UUID(payload.sub))
            if user and user.is_active:
                return user
    except Exception:
        logger.debug("optional_auth_failed")
    return None


OptionalUser = Annotated[User | None, Depends(get_optional_user)]


def require_role(minimum_role: str):
    from src.core.security import ROLE_HIERARCHY, Role

    async def _check(user: CurrentUser) -> User:
        user_level = ROLE_HIERARCHY.get(Role(user.role), 0)
        required_level = ROLE_HIERARCHY.get(Role(minimum_role), 0)
        if user_level < required_level:
            raise ForbiddenError(f"Requires {minimum_role} role or higher")
        return user

    return _check
