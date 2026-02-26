"""Shift CRUD API. RBAC: Admin sees all; Worker sees only their assigned shifts. 403 if Worker accesses another's shift."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import AdminUser, CurrentUser
from app.database import get_db
from app.models.client import Client
from app.models.shift import Shift, ShiftStatus
from app.models.worker import Worker, WorkerRole
from app.schemas.shift import CheckInRequest, CheckOutRequest, ShiftCreate, ShiftResponse, ShiftUpdate
from app.schemas.worker import WorkerResponse
from app.utils.geo import point_from_geometry
from app.utils.storage import save_signature

router = APIRouter(prefix="/shifts", tags=["shifts"])


class SubstituteSuggestion(BaseModel):
    """One suggested substitute worker with distance and capacity info."""

    worker: WorkerResponse
    distance_meters: float = Field(..., description="Distance from worker's current location to client (PostGIS)")
    assigned_hours_this_week: float = Field(..., description="Hours already assigned in the shift's week")
    remaining_capacity_hours: float = Field(..., description="contract_hours - assigned_hours_this_week")


def _shift_to_response(s: Shift, client_name: str | None = None) -> ShiftResponse:
    return ShiftResponse(
        id=s.id,
        worker_id=s.worker_id,
        client_id=s.client_id,
        client_name=client_name,
        start_time=s.start_time,
        end_time=s.end_time,
        status=s.status,
        tasks=s.tasks,
        check_in_at=s.check_in_at,
        check_out_at=s.check_out_at,
        signature_storage_key=s.signature_storage_key,
        cost=getattr(s, "cost", None),
        created_at=s.created_at,
        updated_at=s.updated_at,
        deleted_at=s.deleted_at,
    )


async def _get_client_name(db: AsyncSession, client_id: int) -> str | None:
    r = await db.execute(select(Client.name).where(Client.id == client_id))
    row = r.one_or_none()
    return row[0] if row else None


@router.get("", response_model=list[ShiftResponse])
async def list_shifts(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    include_deleted: bool = Query(False, description="Include soft-deleted shifts (Admin only)"),
):
    """
    List shifts. Admin: all. Worker: only shifts assigned to them.
    """
    q = select(Shift, Client.name).join(Client, Shift.client_id == Client.id)
    if not include_deleted:
        q = q.where(Shift.deleted_at.is_(None))
    if current_user.role == WorkerRole.WORKER:
        q = q.where(Shift.worker_id == current_user.id)
    q = q.order_by(Shift.start_time.desc())
    result = await db.execute(q)
    rows = result.all()
    return [_shift_to_response(s, client_name=name) for s, name in rows]


@router.get("/{shift_id}", response_model=ShiftResponse)
async def get_shift(
    shift_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    include_deleted: bool = Query(False, description="Allow returning soft-deleted shift (Admin only)"),
):
    """
    Get one shift by id. Admin: any. Worker: only if assigned to them; else 403.
    """
    q = select(Shift, Client.name).join(Client, Shift.client_id == Client.id).where(Shift.id == shift_id)
    if not include_deleted:
        q = q.where(Shift.deleted_at.is_(None))
    result = await db.execute(q)
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Shift not found")
    shift, client_name = row
    if current_user.role == WorkerRole.WORKER and shift.worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: cannot access another worker's shift")
    return _shift_to_response(shift, client_name=client_name)


@router.get("/{shift_id}/suggest-substitutes", response_model=list[SubstituteSuggestion])
async def suggest_substitutes(
    shift_id: int,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Suggest up to 3 substitute workers for an (optionally Unassigned) shift. Admin only.
    Uses PostGIS ST_Distance for proximity, filters out workers with overlapping shifts
    and those who would exceed their weekly contract_hours.
    """
    from datetime import timedelta

    result = await db.execute(
        select(Shift, Client).join(Client, Shift.client_id == Client.id).where(Shift.id == shift_id).where(Shift.deleted_at.is_(None))
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Shift not found")
    shift, client = row
    if not client.address_location:
        return []  # No client location: cannot rank by distance
    shift_duration_hours = (shift.end_time - shift.start_time).total_seconds() / 3600.0
    # ISO week (Monday = day 0)
    shift_start = shift.start_time
    week_start = shift_start - timedelta(days=shift_start.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)

    # Workers with overlapping shifts (same worker, different shift, time overlap)
    overlapping_q = (
        select(Shift.worker_id)
        .where(Shift.worker_id.isnot(None))
        .where(Shift.deleted_at.is_(None))
        .where(Shift.id != shift_id)
        .where(Shift.start_time < shift.end_time)
        .where(Shift.end_time > shift.start_time)
    )
    result = await db.execute(overlapping_q)
    busy_worker_ids = {r[0] for r in result.all()}

    # Candidate workers: available, not deleted, have location, not in busy_worker_ids, not the original worker
    exclude_ids = busy_worker_ids | {shift.worker_id} if shift.worker_id else busy_worker_ids
    client_loc_subq = select(Client.address_location).where(Client.id == shift.client_id).scalar_subquery()
    dist_col = func.ST_Distance(client_loc_subq, Worker.current_location)
    q = (
        select(Worker, dist_col.label("distance_m"))
        .where(Worker.is_available.is_(True))
        .where(Worker.deleted_at.is_(None))
        .where(Worker.current_location.isnot(None))
        .order_by(dist_col.asc())
    )
    if exclude_ids:
        q = q.where(Worker.id.notin_(exclude_ids))
    result = await db.execute(q)
    rows = result.all()
    out: list[SubstituteSuggestion] = []
    for worker, distance_m in rows:
        if len(out) >= 3:
            break
        # Weekly assigned hours for this worker (shifts overlapping the same ISO week)
        hours_q = (
            select(func.coalesce(func.sum(func.extract("epoch", Shift.end_time - Shift.start_time) / 3600.0), 0))
            .where(Shift.worker_id == worker.id)
            .where(Shift.deleted_at.is_(None))
            .where(Shift.start_time < week_end)
            .where(Shift.end_time > week_start)
        )
        # Exclude the current shift if it were assigned to this worker (we're suggesting for unassigned shift)
        hours_result = await db.execute(hours_q)
        assigned = float(hours_result.scalar_one())
        if assigned + shift_duration_hours > worker.contract_hours:
            continue
        remaining = worker.contract_hours - assigned
        out.append(
            SubstituteSuggestion(
                worker=_worker_to_response(worker),
                distance_meters=round(float(distance_m), 2),
                assigned_hours_this_week=round(assigned, 2),
                remaining_capacity_hours=round(remaining, 2),
            )
        )
    return out


def _worker_to_response(w: Worker) -> WorkerResponse:
    return WorkerResponse(
        id=w.id,
        name=w.name,
        email=w.email,
        role=w.role,
        contract_hours=w.contract_hours,
        current_location=point_from_geometry(w.current_location),
        is_available=getattr(w, "is_available", True),
        created_at=w.created_at,
        updated_at=w.updated_at,
        deleted_at=w.deleted_at,
    )


def _require_worker_own_shift(shift: Shift, current_user: CurrentUser) -> None:
    """Raise 403 if Worker role and shift is not assigned to them."""
    if current_user.role == WorkerRole.WORKER and shift.worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: can only check-in/out your own assigned shift")


@router.patch("/{shift_id}/check-in", response_model=ShiftResponse)
async def check_in(
    shift_id: int,
    body: CheckInRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Record check-in: GPS location and timestamp. Worker can only check-in to their own assigned shift.
    Sets status to In_Progress. Allowed when status is Scheduled.
    """
    from geoalchemy2 import WKTElement

    result = await db.execute(select(Shift).where(Shift.id == shift_id).where(Shift.deleted_at.is_(None)))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    _require_worker_own_shift(shift, current_user)
    if shift.status != ShiftStatus.SCHEDULED:
        raise HTTPException(
            status_code=400,
            detail=f"Check-in only allowed for Scheduled shifts (current: {shift.status.value})",
        )
    shift.check_in_location = WKTElement(
        f"POINT({body.check_in_location.longitude} {body.check_in_location.latitude})",
        srid=4326,
    )
    shift.check_in_at = datetime.now(timezone.utc)
    shift.status = ShiftStatus.IN_PROGRESS
    await db.flush()
    await db.refresh(shift)
    client_name = await _get_client_name(db, shift.client_id)
    return _shift_to_response(shift, client_name=client_name)


@router.patch("/{shift_id}/check-out", response_model=ShiftResponse)
async def check_out(
    shift_id: int,
    body: CheckOutRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Record check-out: GPS location, timestamp, and client signature (base64 image).
    Saves signature via storage and sets status to Completed. Worker can only check-out their own shift.
    Allowed when status is In_Progress.
    """
    from geoalchemy2 import WKTElement

    result = await db.execute(select(Shift).where(Shift.id == shift_id).where(Shift.deleted_at.is_(None)))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    _require_worker_own_shift(shift, current_user)
    if shift.status != ShiftStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=400,
            detail=f"Check-out only allowed after check-in (current: {shift.status.value})",
        )
    try:
        signature_key = save_signature(shift_id, body.signature_base64)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    shift.check_out_location = WKTElement(
        f"POINT({body.check_out_location.longitude} {body.check_out_location.latitude})",
        srid=4326,
    )
    shift.check_out_at = datetime.now(timezone.utc)
    shift.signature_storage_key = signature_key
    shift.status = ShiftStatus.COMPLETED
    # Budget: cost = duration × hourly rate (Entlastungsbetrag deduction)
    from app.config import settings
    from decimal import Decimal
    duration_hours = (shift.end_time - shift.start_time).total_seconds() / 3600.0
    shift.cost = Decimal(str(round(duration_hours * settings.hourly_rate_eur, 2)))
    await db.flush()
    await db.refresh(shift)
    client_name = await _get_client_name(db, shift.client_id)
    return _shift_to_response(shift, client_name=client_name)


@router.post("", response_model=ShiftResponse, status_code=201)
async def create_shift(
    body: ShiftCreate,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new shift. Admin only."""
    shift = Shift(
        worker_id=body.worker_id,
        client_id=body.client_id,
        start_time=body.start_time,
        end_time=body.end_time,
        status=body.status,
        tasks=body.tasks or "Cleaning",
    )
    db.add(shift)
    await db.flush()
    await db.refresh(shift)
    client_name = await _get_client_name(db, shift.client_id)
    return _shift_to_response(shift, client_name=client_name)


@router.patch("/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    shift_id: int,
    body: ShiftUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Update a shift. Admin: any. Worker: only their own shift (e.g. check-in/check-out).
    """
    result = await db.execute(select(Shift).where(Shift.id == shift_id).where(Shift.deleted_at.is_(None)))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if current_user.role == WorkerRole.WORKER and shift.worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: cannot update another worker's shift")
    from geoalchemy2 import WKTElement

    data = body.model_dump(exclude_unset=True)
    if "check_in_location" in data:
        loc = data.pop("check_in_location")
        shift.check_in_location = (
            WKTElement(f"POINT({loc['longitude']} {loc['latitude']})", srid=4326) if loc else None
        )
    for key, value in data.items():
        setattr(shift, key, value)
    await db.flush()
    await db.refresh(shift)
    client_name = await _get_client_name(db, shift.client_id)
    return _shift_to_response(shift, client_name=client_name)


@router.delete("/{shift_id}", status_code=204)
async def soft_delete_shift(
    shift_id: int,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a shift (GDPR: data retained for audit). Admin only."""
    result = await db.execute(select(Shift).where(Shift.id == shift_id).where(Shift.deleted_at.is_(None)))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    shift.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return None
