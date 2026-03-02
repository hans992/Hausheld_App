"""Geo API: heatmap GeoJSON."""
import pytest
from fastapi.testclient import TestClient


def test_heatmap_requires_auth(client: TestClient):
    r = client.get("/api/v1/geo/heatmap")
    assert r.status_code == 401


def test_heatmap_success(client: TestClient, auth_headers):
    r = client.get("/api/v1/geo/heatmap", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data.get("type") == "FeatureCollection"
    assert "features" in data
    assert isinstance(data["features"], list)
    for f in data["features"][:3]:
        assert f.get("type") == "Feature"
        assert "geometry" in f
        assert f["geometry"].get("type") == "Point"
        assert "properties" in f
        assert "weight" in f["properties"]
