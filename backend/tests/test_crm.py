"""
Tests for CRM deals pipeline and campaigns.
"""

import pytest


@pytest.mark.anyio
async def test_create_deal(authenticated_client):
    response = await authenticated_client.post(
        "/api/v1/deals",
        json={
            "title": "Big Deal",
            "value": 50000,
            "stage": "prospeccion",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Big Deal"
    assert data["value"] == 50000
    assert data["stage"] == "prospeccion"


@pytest.mark.anyio
async def test_list_deals(authenticated_client):
    response = await authenticated_client.get("/api/v1/deals")
    assert response.status_code == 200
    assert "items" in response.json()


@pytest.mark.anyio
async def test_update_deal_stage(authenticated_client):
    deal_resp = await authenticated_client.post(
        "/api/v1/deals",
        json={"title": "Stage Deal"},
    )
    deal_id = deal_resp.json()["id"]

    response = await authenticated_client.patch(
        f"/api/v1/deals/{deal_id}",
        json={"stage": "Negociacion"},
    )
    assert response.status_code == 200
    assert response.json()["stage"] == "Negociacion"


@pytest.mark.anyio
async def test_get_pipeline(authenticated_client):
    response = await authenticated_client.get("/api/v1/deals/pipeline")
    assert response.status_code == 200
    body = response.json()
    stages = body["stages"]
    assert len(stages) >= 5
    stage_names = [s["name"] for s in stages]
    assert "Ganado" in stage_names
    assert "Perdido" in stage_names


@pytest.mark.anyio
async def test_create_campaign(authenticated_client):
    response = await authenticated_client.post(
        "/api/v1/campaigns",
        json={
            "name": "Test Campaign",
            "type": "email",
            "subject": "Hello!",
        },
    )
    assert response.status_code == 201
    assert response.json()["status"] == "draft"


@pytest.mark.anyio
async def test_list_campaigns(authenticated_client):
    await authenticated_client.post(
        "/api/v1/campaigns",
        json={"name": "Test Campaign", "type": "email"},
    )
    response = await authenticated_client.get("/api/v1/campaigns")
    assert response.status_code == 200
    assert "items" in response.json()
