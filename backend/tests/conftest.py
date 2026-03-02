"""Pytest configuration and shared fixtures for API tests.

Assumes DATABASE_URL points to a running Postgres with PostGIS (e.g. dev or CI).
Tables are created by the app lifespan; seed_demo is run once per session so admin@demo.com exists.
"""
import asyncio
import os

import pytest
from fastapi.testclient import TestClient

# Ensure dev login is enabled for tests
os.environ.setdefault("AUTH_DEV_MODE", "true")

from app.main import app
from app.utils.seed_demo import seed_demo


@pytest.fixture(scope="session")
def client():
    """Session-scoped TestClient; app lifespan runs, then seed_demo for auth fixtures."""
    with TestClient(app) as c:
        asyncio.run(seed_demo())
        yield c


@pytest.fixture(scope="session")
def auth_headers(client: TestClient):
    """Bearer token for admin@demo.com (from seed)."""
    r = client.post(
        "/auth/dev-login",
        json={"email": "admin@demo.com"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}"}
