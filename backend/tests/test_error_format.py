"""Unified API error format: validation and generic errors."""
import pytest
from fastapi.testclient import TestClient


def test_validation_error_format(client: TestClient):
    """422 RequestValidationError should return error.code, error.message, details."""
    r = client.post("/auth/dev-login", json={"email": "not-an-email"})
    assert r.status_code == 422
    data = r.json()
    assert "error" in data
    assert data["error"].get("code") == "validation_error"
    assert "message" in data["error"]
    assert "details" in data["error"]


def test_me_invalid_token_returns_401(client: TestClient):
    r = client.get("/auth/me", headers={"Authorization": "Bearer invalid-token"})
    assert r.status_code == 401
