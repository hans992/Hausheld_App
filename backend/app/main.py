"""Hausheld – German home-help workflow API."""
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.audit import router as audit_router
from app.api.clients import router as clients_router
from app.api.exports import router as exports_router
from app.api.geo import router as geo_router
from app.api.shifts import router as shifts_router
from app.api.stats import router as stats_router
from app.api.workers import router as workers_router
from app.auth.router import router as auth_router
from app.config import settings
from app.database import engine, Base
from app.models import AuditLog, Client, Shift, Worker  # noqa: F401 - register models for metadata

logger = logging.getLogger(__name__)


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


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log method, path, status, duration; log 4xx/5xx with safe context."""
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    status = response.status_code
    msg = f"{request.method} {request.url.path} {status} {duration_ms:.1f}ms"
    if status >= 500:
        logger.error(msg)
    elif status >= 400:
        logger.warning(msg)
    else:
        logger.info(msg)
    return response


def error_response(code: str, message: str, status_code: int, details: list | dict | None = None) -> JSONResponse:
    """Unified error JSON: error.code, error.message, optional details."""
    body = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    return error_response(
        code="validation_error",
        message="Request validation failed",
        status_code=422,
        details=errors,
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return error_response(
        code="internal_error",
        message="An unexpected error occurred",
        status_code=500,
    )


app.include_router(auth_router)
app.include_router(geo_router, prefix="/api/v1/geo")
app.include_router(stats_router, prefix="/api/v1/stats")
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


@app.get("/health")
async def health():
    """Static health check for load balancers."""
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    """Readiness check: DB connectivity (e.g. SELECT 1) for k8s/lb."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        logger.warning("Readiness check failed: %s", e)
        return JSONResponse(
            status_code=503,
            content={"error": {"code": "not_ready", "message": "Database unavailable"}},
        )
