"""
Tests for authentication flow: register, login, token validation.
"""

import uuid

import pytest

_REGISTER_BASE = {
    "password": "SecurePass123!",
    "full_name": "Test User",
    "company_name": "Test Org",
}


@pytest.mark.anyio
async def test_register_user(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"new-{uuid.uuid4().hex[:6]}@test.com",
            **_REGISTER_BASE,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"  # noqa: S105
    assert "expires_in" in data


@pytest.mark.anyio
async def test_register_duplicate_email(client):
    email = f"dup-{uuid.uuid4().hex[:6]}@test.com"
    payload = {"email": email, **_REGISTER_BASE}
    r1 = await client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = await client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409


@pytest.mark.anyio
async def test_register_missing_fields(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "incomplete@test.com"},
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_register_invalid_email(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "not-an-email",
            "password": "SecurePass123!",
            "full_name": "X",
            "company_name": "Y",
        },
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_login_success(client):
    email = f"login-{uuid.uuid4().hex[:6]}@test.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, **_REGISTER_BASE},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": _REGISTER_BASE["password"]},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.anyio
async def test_login_wrong_password(client):
    email = f"wrong-{uuid.uuid4().hex[:6]}@test.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, **_REGISTER_BASE},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "wrongpassword"},
    )
    assert response.status_code == 401


@pytest.mark.anyio
async def test_login_nonexistent_user(client):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@test.com", "password": "whatever"},
    )
    assert response.status_code == 401


@pytest.mark.anyio
async def test_protected_route_requires_auth(client):
    response = await client.get("/api/v1/deals/activity/recent")
    assert response.status_code in (401, 403, 422)


@pytest.mark.anyio
async def test_protected_route_with_valid_token(authenticated_client):
    response = await authenticated_client.get("/api/v1/deals/activity/recent")
    assert response.status_code == 200
