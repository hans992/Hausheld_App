"""Admin-only exports (Phase 5: SGB XI billing CSV)."""
import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import AdminUser
from app.database import get_db
from app.models.client import Client
from app.models.shift import Shift, ShiftStatus
from app.utils.crypto import decrypt_value

router = APIRouter(prefix="/exports", tags=["exports"])


def _parse_month(month_str: str) -> tuple[int, int]:
    parts = month_str.strip().split("-")
    if len(parts) != 2:
        raise ValueError("month must be YYYY-MM")
    year, month = int(parts[0]), int(parts[1])
    if not (1 <= month <= 12):
        raise ValueError("month must be 01-12")
    return year, month


@router.get("/billing")
async def export_billing_csv(
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
    month: str = Query(..., description="Month as YYYY-MM (e.g. 2025-02)"),
):
    """
    Admin only. Export all Completed (and signed) shifts for the given month as CSV
    for SGB XI billing: Client Name, Insurance Number, Date, Duration, Signature Key.
    """
    try:
        year, month_num = _parse_month(month)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    month_start = datetime(year, month_num, 1, tzinfo=timezone.utc)
    if month_num == 12:
        month_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        month_end = datetime(year, month_num + 1, 1, tzinfo=timezone.utc)
    q = (
        select(Shift)
        .where(Shift.deleted_at.is_(None))
        .where(Shift.status == ShiftStatus.COMPLETED)
        .where(Shift.start_time >= month_start)
        .where(Shift.start_time < month_end)
        .options(selectinload(Shift.client))
        .order_by(Shift.client_id, Shift.start_time.asc())
    )
    result = await db.execute(q)
    shifts = result.scalars().unique().all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    # SGB XI–oriented header
    writer.writerow(["Client Name", "Insurance Number", "Date", "Duration (hours)", "Signature Key"])
    for shift in shifts:
        client: Client = shift.client
        duration_hours = (shift.end_time - shift.start_time).total_seconds() / 3600.0
        writer.writerow([
            client.name,
            decrypt_value(client.insurance_number) if client.insurance_number else "",
            shift.start_time.date().isoformat(),
            round(duration_hours, 2),
            shift.signature_storage_key or "",
        ])
    buf.seek(0)
    filename = f"billing_{month}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
