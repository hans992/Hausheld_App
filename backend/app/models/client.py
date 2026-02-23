"""Client model: address, insurance, care level, monthly budget (Entlastungsbetrag)."""
from decimal import Decimal
from typing import TYPE_CHECKING

from geoalchemy2 import Geography
from sqlalchemy import Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.shift import Shift


class Client(Base, SoftDeleteMixin, TimestampMixin):
    """Client: address, insurance, Pflegegrad, monthly Entlastungsbetrag."""

    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(512), nullable=False)
    insurance_provider: Mapped[str] = mapped_column(String(255), nullable=False)
    insurance_number: Mapped[str | None] = mapped_column(Text, nullable=True)  # Encrypted at rest (Phase 6)
    care_level: Mapped[str] = mapped_column(Text, nullable=False)  # Encrypted at rest; stored as "1".."5" or ciphertext
    monthly_budget: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )  # e.g. 125.00 or 131.00 (Entlastungsbetrag)
    # PostGIS point for client address (used by substitution engine for ST_Distance).
    address_location: Mapped[Geography | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=True,
    )

    shifts: Mapped[list["Shift"]] = relationship(
        "Shift",
        back_populates="client",
        foreign_keys="Shift.client_id",
    )

    def __repr__(self) -> str:
        return f"<Client id={self.id} name={self.name!r} care_level={self.care_level}>"
