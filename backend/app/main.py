"""Hausheld – German home-help workflow API."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.audit import router as audit_router
from app.api.clients import router as clients_router
from app.api.exports import router as exports_router
from app.api.shifts import router as shifts_router
from app.api.workers import router as workers_router
from app.auth.router import router as auth_router
from app.config import settings
from app.database import engine, Base
from app.models import AuditLog, Client, Shift, Worker  # noqa: F401 - register models for metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup (for dev). In production use Alembic migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Hausheld API",
    description="Workflow management for German home-help services (NRW). Workers, clients, shifts, GDPR soft deletes, PostGIS.",
    version="0.1.0",
    lifespan=lifespan,
)

# Parse ALLOWED_ORIGINS: "*" or "https://a.com,https://b.com" -> list for CORS
_origins = (
    [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
    if settings.allowed_origins.strip()
    else ["*"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(workers_router)
app.include_router(clients_router)
app.include_router(shifts_router)
app.include_router(exports_router)
app.include_router(audit_router)
if settings.auth_dev_mode:
    from app.api.dev import router as dev_router
    app.include_router(dev_router)


@app.get("/")
async def root():
    return {"service": "Hausheld", "docs": "/docs"}
