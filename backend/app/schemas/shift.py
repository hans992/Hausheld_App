"""Pydantic schemas for Shift."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.worker import PointSchema
from app.models.shift import ShiftStatus


class ShiftBase(BaseModel):
    worker_id: int | None = None
    client_id: int
    start_time: datetime
    end_time: datetime
    status: ShiftStatus = ShiftStatus.SCHEDULED
    tasks: str = Field("Cleaning", max_length=255)  # e.g. "Cleaning,Cooking"


class ShiftCreate(ShiftBase):
    pass


class ShiftUpdate(BaseModel):
    worker_id: int | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: ShiftStatus | None = None
    tasks: str | None = Field(None, max_length=255)
    check_in_location: PointSchema | None = None
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    signature_storage_key: str | None = None


class CheckInRequest(BaseModel):
    """GPS at check-in (Leistungsnachweis)."""

    check_in_location: PointSchema = Field(..., description="Worker's current GPS coordinates at client location")


class CheckOutRequest(BaseModel):
    """GPS and client signature at check-out."""

    check_out_location: PointSchema = Field(..., description="Worker's GPS coordinates at check-out")
    signature_base64: str = Field(
        ...,
        min_length=1,
        description="Base64-encoded signature image (e.g. data:image/png;base64,... or raw base64)",
    )


class ShiftResponse(ShiftBase):
    id: int
    client_name: str | None = None  # For mobile: display name instead of "Client #id"
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    signature_storage_key: str | None = None
    cost: Decimal | None = None  # Set at check-out: duration × hourly rate (Phase 5)
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True
