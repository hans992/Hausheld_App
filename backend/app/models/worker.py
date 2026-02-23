"""Worker model: staff with role, contract hours, and current location (PostGIS)."""
import enum
from typing import TYPE_CHECKING

from geoalchemy2 import Geography
from sqlalchemy import Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.shift import Shift


class WorkerRole(str, enum.Enum):
    """User role for access control."""

    ADMIN = "Admin"
    WORKER = "Worker"


class Worker(Base, SoftDeleteMixin, TimestampMixin):
    """Worker (employee): name, role, contract hours, current location."""

    __tablename__ = "workers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    role: Mapped[WorkerRole] = mapped_column(
        Enum(WorkerRole),
        nullable=False,
        default=WorkerRole.WORKER,
    )
    contract_hours: Mapped[int] = mapped_column(Integer, nullable=False)  # 20 or 40 per week
    # PostGIS point: longitude, latitude (WGS84). Updated when worker checks in or app reports location.
    current_location: Mapped[Geography | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=True,
    )
    # False when on sick leave; used by substitution engine to exclude from suggestions.
    is_available: Mapped[bool] = mapped_column(nullable=False, default=True, server_default="true")

    shifts: Mapped[list["Shift"]] = relationship(
        "Shift",
        back_populates="worker",
        foreign_keys="Shift.worker_id",
    )

    def __repr__(self) -> str:
        return f"<Worker id={self.id} name={self.name!r} role={self.role.value}>"
