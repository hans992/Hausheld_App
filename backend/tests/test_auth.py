"""Auth: dev-login and /auth/me."""
import pytest
from fastapi.testclient import TestClient


def test_dev_login_success(client: TestClient):
    r = client.post("/auth/dev-login", json={"email": "admin@demo.com"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data.get("token_type", "").lower() == "bearer"
    assert data.get("expires_in_seconds") == 24 * 3600


def test_dev_login_not_found(client: TestClient):
    r = client.post("/auth/dev-login", json={"email": "nonexistent@demo.com"})
    assert r.status_code == 404
    # Unified error format
    data = r.json()
    assert "error" in data
    assert "message" in data["error"] or "detail" in data


def test_me_requires_auth(client: TestClient):
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_me_success(client: TestClient, auth_headers):
    r = client.get("/auth/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data.get("email") == "admin@demo.com"
    assert data.get("role") == "admin"
    assert "id" in data
    assert "name" in data
