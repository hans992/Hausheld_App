"""Append-only audit log for GDPR: who accessed or changed client health data."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditAction(str, enum.Enum):
    VIEW = "VIEW"
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class AuditTargetType(str, enum.Enum):
    CLIENT = "Client"
    # Extensible: Worker, Shift, etc.


class AuditLog(Base):
    """
    Immutable audit log. Written only by the application; no update/delete via API.
    Records access to or changes of client (health) data for compliance.
    """

    __tablename__ = "audit_logs"
    __table_args__ = {"comment": "GDPR audit trail; append-only, read-only via API"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workers.id", ondelete="SET NULL"),
        nullable=True,
    )  # Who performed the action
    action: Mapped[AuditAction] = mapped_column(Enum(AuditAction), nullable=False)
    target_type: Mapped[AuditTargetType] = mapped_column(Enum(AuditTargetType), nullable=False)
    target_id: Mapped[int] = mapped_column(Integer, nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)  # Optional JSON or summary
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
