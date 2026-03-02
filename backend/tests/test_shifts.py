"""Shifts API: list shifts (auth required)."""
import pytest
from fastapi.testclient import TestClient


def test_list_shifts_requires_auth(client: TestClient):
    r = client.get("/shifts")
    assert r.status_code == 401


def test_list_shifts_success(client: TestClient, auth_headers):
    r = client.get("/shifts", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    # Seed creates multiple shifts; admin sees all
    for item in data[:3]:
        assert "id" in item
        assert "client_id" in item
        assert "start_time" in item
        assert "status" in item
