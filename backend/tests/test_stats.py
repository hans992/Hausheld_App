"""Stats API: dashboard-summary."""
import pytest
from fastapi.testclient import TestClient


def test_dashboard_summary_requires_auth(client: TestClient):
    r = client.get("/api/v1/stats/dashboard-summary")
    assert r.status_code == 401


def test_dashboard_summary_success(client: TestClient, auth_headers):
    r = client.get("/api/v1/stats/dashboard-summary", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "weekly_shift_trends" in data
    assert "city_distribution" in data
    assert "budget_usage" in data
    assert "total_active_workers" in data
    assert "total_clients" in data
    assert "monthly_revenue" in data
    assert "top_workers_completed_shifts" in data
    assert isinstance(data["weekly_shift_trends"], list)
    assert isinstance(data["city_distribution"], list)
    assert "total_spent" in data["budget_usage"]
    assert "total_allocated" in data["budget_usage"]
