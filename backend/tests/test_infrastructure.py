"""
Tests for cache infrastructure, tracking, and discovery routes.
"""

import pytest


@pytest.mark.anyio
async def test_cache_set_and_get():
    from src.infrastructure.cache import cache_get, cache_set

    await cache_set("test_key", {"foo": "bar"}, ttl=60)
    result = await cache_get("test_key")
    assert result == {"foo": "bar"}


@pytest.mark.anyio
async def test_cache_delete():
    from src.infrastructure.cache import cache_delete, cache_get, cache_set

    await cache_set("delete_key", "value")
    await cache_delete("delete_key")
    assert await cache_get("delete_key") is None


@pytest.mark.anyio
async def test_cache_miss():
    from src.infrastructure.cache import cache_get

    result = await cache_get("nonexistent_key_xyz")
    assert result is None


@pytest.mark.anyio
async def test_cache_get_or_set():
    from src.infrastructure.cache import cache_get_or_set

    async def factory():
        return {"computed": True}

    result = await cache_get_or_set("computed_key", factory)
    assert result == {"computed": True}

    async def factory2():
        return {"should_not_be_called": True}

    result2 = await cache_get_or_set("computed_key", factory2)
    assert result2 == {"computed": True}


@pytest.mark.anyio
async def test_tracking_open_returns_pixel(client):
    response = await client.get("/api/v1/campaigns/track/open/test-tracking-id")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/gif"


@pytest.mark.anyio
async def test_tracking_click_redirects(client):
    response = await client.get("/api/v1/campaigns/track/click/test-id?url=https://example.com")
    assert response.status_code == 302
    assert "example.com" in response.headers.get("location", "")


@pytest.mark.anyio
async def test_tracking_unsubscribe(client):
    import uuid

    response = await client.post(f"/api/v1/campaigns/track/unsubscribe/{uuid.uuid4()}")
    assert response.status_code == 200


@pytest.mark.anyio
async def test_discovery_parse_intent(authenticated_client):
    response = await authenticated_client.post(
        "/api/v1/discovery/parse-intent",
        json={"intent": "empresas de tecnologia en Buenos Aires"},
    )
    assert response.status_code == 200


@pytest.mark.anyio
async def test_analytics_overview(authenticated_client):
    response = await authenticated_client.get("/api/v1/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_companies" in data
    assert "pipeline_value" in data
