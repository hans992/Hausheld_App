"""Read-only audit log API (Phase 6). No create/update/delete – integrity preserved."""
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import AdminUser
from app.database import get_db
from app.models.audit_log import AuditAction, AuditLog, AuditTargetType

router = APIRouter(prefix="/audit-logs", tags=["audit"])


class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    action: str
    target_type: str
    target_id: int
    details: str | None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=list[AuditLogResponse])
async def list_audit_logs(
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
    target_type: AuditTargetType | None = Query(None, description="Filter by target type (e.g. Client)"),
    target_id: int | None = Query(None, description="Filter by target id"),
    user_id: int | None = Query(None, description="Filter by user who performed the action"),
    action: AuditAction | None = Query(None, description="Filter by action"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """
    Admin only. Read-only list of audit log entries. No POST/PATCH/DELETE – logs are append-only by the backend.
    """
    q = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    if target_type is not None:
        q = q.where(AuditLog.target_type == target_type)
    if target_id is not None:
        q = q.where(AuditLog.target_id == target_id)
    if user_id is not None:
        q = q.where(AuditLog.user_id == user_id)
    if action is not None:
        q = q.where(AuditLog.action == action)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        AuditLogResponse(
            id=r.id,
            user_id=r.user_id,
            action=r.action.value,
            target_type=r.target_type.value,
            target_id=r.target_id,
            details=r.details,
            created_at=r.created_at,
        )
        for r in rows
    ]
