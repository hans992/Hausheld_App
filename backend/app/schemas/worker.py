"""Pydantic schemas for Worker."""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.worker import WorkerRole


class PointSchema(BaseModel):
    """Longitude and latitude (WGS84)."""

    longitude: float = Field(..., ge=-180, le=180)
    latitude: float = Field(..., ge=-90, le=90)


class WorkerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    role: WorkerRole = WorkerRole.WORKER
    contract_hours: int = Field(..., ge=1, le=40)  # typically 20 or 40


class WorkerCreate(WorkerBase):
    current_location: PointSchema | None = None


class WorkerUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    role: WorkerRole | None = None
    contract_hours: int | None = Field(None, ge=1, le=40)
    current_location: PointSchema | None = None
    is_available: bool | None = None


class WorkerResponse(WorkerBase):
    id: int
    current_location: PointSchema | None = None
    is_available: bool = True
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True
