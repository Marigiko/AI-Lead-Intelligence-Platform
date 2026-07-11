"""
Pytest configuration and shared fixtures.
"""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

os.environ["ENVIRONMENT"] = "testing"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only"  # noqa: S105
os.environ["SECRET_KEY"] = "test-app-secret-for-testing-only"  # noqa: S105
os.environ["REDIS_URL"] = "redis://localhost:6381/0"
os.environ["DATABASE_URL"] = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://leadplatform:leadplatform@localhost:5434/leadplatform_test",
)

if TYPE_CHECKING:
    pass

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api.dependencies import get_db
from src.api.app import create_app

import importlib

for _model_mod in (
    "src.domain.audit.models",
    "src.domain.campaign.models",
    "src.domain.company.models",
    "src.domain.contact.models",
    "src.domain.conversation.models",
    "src.domain.deal.models",
    "src.domain.tenant.models",
    "src.domain.user.models",
):
    importlib.import_module(_model_mod)
del importlib, _model_mod


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create a fresh test client with DB dependency override."""
    from src.core.config import get_settings

    _ = get_settings()
    app = create_app()

    _engine_cache = {}

    def _get_engine():
        import asyncio

        loop = asyncio.get_event_loop()
        loop_id = id(loop)
        if loop_id not in _engine_cache:
            from sqlalchemy.ext.asyncio import create_async_engine

            _engine_cache[loop_id] = create_async_engine(
                os.getenv(
                    "TEST_DATABASE_URL",
                    "postgresql+asyncpg://leadplatform:leadplatform@localhost:5434/leadplatform_test",
                ),
                pool_pre_ping=True,
            )
        return _engine_cache[loop_id]

    async def _override_db():
        factory = async_sessionmaker(bind=_get_engine(), expire_on_commit=False)
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = _override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    for engine in _engine_cache.values():
        await engine.dispose()
    _engine_cache.clear()


@pytest_asyncio.fixture(scope="function")
async def authenticated_client(client: AsyncClient) -> AsyncClient:
    """Client with a registered user and valid bearer token."""
    import uuid as uuid_mod

    unique_email = f"test-{uuid_mod.uuid4().hex[:8]}@company.com"
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": "TestPassword123!",
            "full_name": "Test User",
            "company_name": "Test Company",
        },
    )
    assert response.status_code == 201, f"Registration failed: {response.text}"
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
