"""
Tests for companies read endpoints and discovery-created companies.
"""

import pytest


@pytest.mark.anyio
async def test_list_companies(authenticated_client):
    response = await authenticated_client.get("/api/v1/companies")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.anyio
async def test_list_companies_with_pagination(authenticated_client):
    response = await authenticated_client.get("/api/v1/companies?limit=5&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert data["limit"] == 5


@pytest.mark.anyio
async def test_list_companies_with_search(authenticated_client):
    response = await authenticated_client.get("/api/v1/companies?search=test")
    assert response.status_code == 200


@pytest.mark.anyio
async def test_get_company_not_found(authenticated_client):
    response = await authenticated_client.get(
        "/api/v1/companies/00000000-0000-0000-0000-000000000000"
    )
    assert response.status_code == 404


@pytest.mark.anyio
async def test_list_companies_filter_by_industry(authenticated_client):
    response = await authenticated_client.get("/api/v1/companies?industry=Tech")
    assert response.status_code == 200
