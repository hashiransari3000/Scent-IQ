from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def perfume_id(client: TestClient) -> str:
    response = client.get("/v1/catalogue", params={"limit": 1})
    assert response.status_code == 200
    return response.json()["items"][0]["id"]


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["perfumes"] == 1478
    assert body["clusters"] >= 4


def test_model_info(client: TestClient) -> None:
    response = client.get("/v1/model/info")
    assert response.status_code == 200
    body = response.json()
    assert body["catalogue"]["perfumes"] == 1478
    assert body["classifier"]["metrics"]["roc_auc"] >= 0.60
    assert body["limitations"]


def test_taxonomy(client: TestClient) -> None:
    response = client.get("/v1/taxonomy")
    assert response.status_code == 200
    body = response.json()
    assert len(body["families"]) == 14
    assert body["clusters"]
    assert len(body["topNotes"]) == 60


def test_recommend(client: TestClient, perfume_id: str) -> None:
    response = client.post(
        "/v1/recommend",
        json={
            "loved_ids": [perfume_id],
            "love_notes": ["rose", "oud"],
            "avoid_notes": ["vanilla"],
            "budget_tier": 3,
            "seasons": ["autumn"],
            "times": ["evening"],
            "limit": 5,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 5
    assert perfume_id not in {item["id"] for item in body["items"]}
    assert all(item["match"] > 0 and item["reasons"] for item in body["items"])


def test_explain_and_404(client: TestClient, perfume_id: str) -> None:
    response = client.post(f"/v1/explain/{perfume_id}", json={"love_notes": ["rose"]})
    assert response.status_code == 200
    assert response.json()["id"] == perfume_id
    missing = client.post("/v1/explain/not-a-perfume", json={})
    assert missing.status_code == 404


def test_perfume_and_similar(client: TestClient, perfume_id: str) -> None:
    response = client.get(f"/v1/perfumes/{perfume_id}")
    assert response.status_code == 200
    assert response.json()["similar"]
    similar = client.get(f"/v1/perfumes/{perfume_id}/similar", params={"limit": 4})
    assert similar.status_code == 200
    assert len(similar.json()["items"]) == 4


def test_catalogue_filters(client: TestClient) -> None:
    response = client.get(
        "/v1/catalogue",
        params={"season": ["summer"], "budget_max": 2, "limit": 10},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["items"]
    assert body["total"] <= 1478
    for item in body["items"]:
        assert "summer" in item["seasons"]
        assert item["priceTier"] <= 2


def test_validation(client: TestClient) -> None:
    too_many = client.post("/v1/recommend", json={"limit": 500})
    assert too_many.status_code == 422
    bad_gender = client.get("/v1/catalogue", params={"gender": "robot"})
    assert bad_gender.status_code == 422


def test_cors_preflight(client: TestClient) -> None:
    response = client.options(
        "/v1/recommend",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
