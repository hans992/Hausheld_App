"""Health and readiness endpoints."""
import pytest
from fastapi.testclient import TestClient


def test_health(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_ready(client: TestClient):
    """Readiness depends on DB; expect 200 when Postgres is available."""
    r = client.get("/ready")
    # 200 when DB is up, 503 when not
    assert r.status_code in (200, 503)
    data = r.json()
    if r.status_code == 200:
        assert data == {"status": "ok"}
    else:
        assert "error" in data
        assert data["error"].get("code") == "not_ready"
