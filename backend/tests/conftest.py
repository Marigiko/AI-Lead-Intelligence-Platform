"""
Pytest configuration and shared fixtures.
Uses DATABASE_URL env var for test DB and resets engine cache between tests.
"""

from __future__ import annotations

import os
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
    from collections.abc import AsyncGenerator

    from sqlalchemy.ext.asyncio import AsyncSession


import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from src.api.app import app
from src.core.database import reset_db_cache


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def _reset_engine_cache():
    """Clear the cached engine/session factory before each test (new event loop)."""
    reset_db_cache()
    return


@pytest_asyncio.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create a test client using the test database."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(scope="function")
async def session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a raw database session for unit tests."""
    from src.core.database import get_session_factory

    factory = get_session_factory()
    async with factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def authenticated_client(client: AsyncClient) -> AsyncClient:
    """Client with a registered user and valid bearer token."""
    import uuid

    unique_email = f"test-{uuid.uuid4().hex[:8]}@company.com"
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
