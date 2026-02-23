"""Pydantic schemas for Client."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.worker import PointSchema


class ClientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: str = Field(..., min_length=1, max_length=512)
    insurance_provider: str = Field(..., min_length=1, max_length=255)
    insurance_number: str | None = Field(None, max_length=255)  # For SGB XI billing export
    care_level: int = Field(..., ge=1, le=5)  # Pflegegrad 1–5
    monthly_budget: Decimal = Field(..., ge=0, decimal_places=2)  # e.g. 125.00 or 131.00


class ClientCreate(ClientBase):
    address_location: PointSchema | None = None  # Optional; for substitution engine


class ClientUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    address: str | None = Field(None, min_length=1, max_length=512)
    insurance_provider: str | None = Field(None, min_length=1, max_length=255)
    insurance_number: str | None = Field(None, max_length=255)
    care_level: int | None = Field(None, ge=1, le=5)
    monthly_budget: Decimal | None = Field(None, ge=0, decimal_places=2)
    address_location: PointSchema | None = None


class ClientResponse(ClientBase):
    id: int
    address_location: PointSchema | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True
