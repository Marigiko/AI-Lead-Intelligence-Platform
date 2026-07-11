from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import CurrentUser
from src.application.auth.dto import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from src.application.auth.use_cases import AuthUseCases
from src.core.database import get_db
from src.infrastructure.database.repositories.tenant_repo import SQLAlchemyTenantRepository
from src.infrastructure.database.repositories.user_repo import SQLAlchemyUserRepository

if TYPE_CHECKING:
    from src.domain.tenant.repository import TenantRepository
    from src.domain.user.repository import UserRepository

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _get_use_cases(session: AsyncSession) -> AuthUseCases:
    user_repo: UserRepository = SQLAlchemyUserRepository(session)
    tenant_repo: TenantRepository = SQLAlchemyTenantRepository(session)
    return AuthUseCases(user_repo, tenant_repo, session)


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: RegisterRequest, session: AsyncSession = Depends(get_db)):  # noqa: B008
    use_cases = _get_use_cases(session)
    return await use_cases.register(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, session: AsyncSession = Depends(get_db)):  # noqa: B008
    use_cases = _get_use_cases(session)
    return await use_cases.login(data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, session: AsyncSession = Depends(get_db)):  # noqa: B008
    use_cases = _get_use_cases(session)
    return await use_cases.refresh_token(data.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: CurrentUser):
    return UserResponse.model_validate(user)
