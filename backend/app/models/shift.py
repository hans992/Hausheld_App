"""Shift model: links Worker/Client, times, status, GPS check-in, tasks."""
import enum
from datetime import datetime
from typing import TYPE_CHECKING

from decimal import Decimal

from geoalchemy2 import Geography
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.worker import Worker


class ShiftStatus(str, enum.Enum):
    """Shift lifecycle status."""

    SCHEDULED = "Scheduled"
    IN_PROGRESS = "In_Progress"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    UNASSIGNED = "Unassigned"  # e.g. worker sick, needs substitution


class ShiftTask(str, enum.Enum):
    """Activity type for billing and scheduling (SGB XI)."""

    CLEANING = "Cleaning"
    COOKING = "Cooking"
    CHORES = "Chores"
    SHOPPING = "Shopping"


class Shift(Base, SoftDeleteMixin, TimestampMixin):
    """Service visit: worker, client, times, status, GPS, tasks."""

    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    worker_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("workers.id", ondelete="SET NULL"),
        nullable=True,
    )  # Null when Unassigned
    client_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=False,
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[ShiftStatus] = mapped_column(
        Enum(ShiftStatus),
        nullable=False,
        default=ShiftStatus.SCHEDULED,
    )
    # Tasks performed (stored as comma-separated or JSON; using simple string for flexibility)
    tasks: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default=ShiftTask.CLEANING.value,
    )  # e.g. "Cleaning,Cooking" or single value
    # GPS at check-in (Leistungsnachweis)
    check_in_location: Mapped[Geography | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=True,
    )
    check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # GPS at check-out (Leistungsnachweis)
    check_out_location: Mapped[Geography | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=True,
    )
    # Optional: signature storage key (e.g. S3) for digital signature
    signature_storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Cost (Duration × Rate) set at check-out for budget tracking (Entlastungsbetrag deduction).
    cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    worker: Mapped["Worker | None"] = relationship(
        "Worker",
        back_populates="shifts",
        foreign_keys=[worker_id],
    )
    client: Mapped["Client"] = relationship(
        "Client",
        back_populates="shifts",
        foreign_keys=[client_id],
    )

    def __repr__(self) -> str:
        return f"<Shift id={self.id} worker_id={self.worker_id} client_id={self.client_id} status={self.status.value}>"
