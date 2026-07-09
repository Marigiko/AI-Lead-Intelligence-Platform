from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import uuid4

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.auth.dto import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from src.core.config import get_settings
from src.core.exceptions import ConflictError, UnauthorizedError, ValidationError
from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from src.domain.tenant.models import Tenant
from src.domain.tenant.repository import TenantRepository
from src.domain.user.models import User
from src.domain.user.repository import UserRepository

logger = structlog.get_logger()


def _slugify(name: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", name.lower().strip())
    return re.sub(r"[-\s]+", "-", slug)


class AuthUseCases:
    def __init__(
        self,
        user_repo: UserRepository,
        tenant_repo: TenantRepository,
        session: AsyncSession,
    ) -> None:
        self._user_repo = user_repo
        self._tenant_repo = tenant_repo
        self._session = session

    async def register(self, data: RegisterRequest) -> TokenResponse:
        # Check existing user
        existing = await self._user_repo.get_by_email(data.email)
        if existing:
            raise ConflictError("A user with this email already exists")

        # Create tenant
        slug = _slugify(data.company_name)
        existing_slug = await self._tenant_repo.get_by_slug(slug)
        if existing_slug:
            slug = f"{slug}-{uuid4().hex[:6]}"

        tenant = Tenant(name=data.company_name, slug=slug)
        tenant = await self._tenant_repo.create(tenant)

        # Create user
        user = User(
            tenant_id=tenant.id,
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role="owner",
        )
        user = await self._user_repo.create(user)

        logger.info("user_registered", user_id=str(user.id), tenant_id=str(tenant.id))

        return self._create_tokens(user)

    async def login(self, data: LoginRequest) -> TokenResponse:
        user = await self._user_repo.get_by_email(data.email)
        if not user or not user.hashed_password:
            raise UnauthorizedError("Invalid email or password")

        if not verify_password(data.password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedError("Account is disabled")

        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        await self._user_repo.update(user)

        logger.info("user_logged_in", user_id=str(user.id))
        return self._create_tokens(user)

    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if not payload or payload.type.value != "refresh":
            raise UnauthorizedError("Invalid refresh token")

        from uuid import UUID

        user = await self._user_repo.get_by_id(UUID(payload.sub))
        if not user or not user.is_active:
            raise UnauthorizedError("Invalid refresh token")

        return self._create_tokens(user)

    async def get_current_user(self, user_id: str) -> UserResponse:
        from uuid import UUID

        user = await self._user_repo.get_by_id(UUID(user_id))
        if not user:
            raise UnauthorizedError("User not found")
        return UserResponse.model_validate(user)

    def _create_tokens(self, user: User) -> TokenResponse:
        settings = get_settings()
        access = create_access_token(user.id, user.tenant_id, user.role)
        refresh = create_refresh_token(user.id, user.tenant_id, user.role)
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        )
