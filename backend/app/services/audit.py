"""Append-only audit logging for client (health) data access."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditAction, AuditLog, AuditTargetType


async def log_audit(
    db: AsyncSession,
    user_id: int | None,
    action: AuditAction,
    target_type: AuditTargetType,
    target_id: int,
    details: str | None = None,
) -> None:
    """Append an audit log entry. Call after successful view/update of client data."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    db.add(entry)
    await db.flush()
