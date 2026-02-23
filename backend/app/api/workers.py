"""Worker CRUD API. RBAC: Admin sees all; Worker sees only own profile. 403 if Worker accesses another worker."""
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import AdminUser, CurrentUser
from app.database import get_db
from app.models.shift import Shift, ShiftStatus
from app.models.worker import Worker, WorkerRole
from app.schemas.worker import PointSchema, WorkerCreate, WorkerResponse, WorkerUpdate
from app.utils.geo import point_from_geometry

router = APIRouter(prefix="/workers", tags=["workers"])


class SickLeaveRequest(BaseModel):
    """Date range for sick leave; all shifts in this range become Unassigned."""

    start_date: date = Field(..., description="First day of sick leave (inclusive)")
    end_date: date = Field(..., description="Last day of sick leave (inclusive)")


class SickLeaveResponse(BaseModel):
    worker_id: int
    is_available: bool
    shifts_marked_unassigned: int


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


@router.get("", response_model=list[WorkerResponse])
async def list_workers(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    include_deleted: bool = Query(False, description="Include soft-deleted workers (Admin only)"),
):
    """
    List workers. Admin: all. Worker: only their own profile (single-element list).
    """
    if current_user.role == WorkerRole.ADMIN:
        q = select(Worker)
        if not include_deleted:
            q = q.where(Worker.deleted_at.is_(None))
        q = q.order_by(Worker.id)
        result = await db.execute(q)
        workers = result.scalars().all()
        return [_worker_to_response(w) for w in workers]
    # Worker: only themselves
    if include_deleted and current_user.deleted_at is not None:
        return []
    return [_worker_to_response(current_user)]


@router.get("/me", response_model=WorkerResponse)
async def get_me(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    """Current user's own profile (convenience endpoint)."""
    await db.refresh(current_user)
    return _worker_to_response(current_user)


@router.get("/{worker_id}", response_model=WorkerResponse)
async def get_worker(
    worker_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    include_deleted: bool = Query(False, description="Allow returning soft-deleted worker (Admin only)"),
):
    """
    Get one worker by id. Admin: any. Worker: only own id; 403 for another worker.
    """
    if current_user.role == WorkerRole.WORKER and worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: cannot access another worker's data")
    q = select(Worker).where(Worker.id == worker_id)
    if not include_deleted:
        q = q.where(Worker.deleted_at.is_(None))
    result = await db.execute(q)
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return _worker_to_response(worker)


@router.post("/{worker_id}/sick-leave", response_model=SickLeaveResponse)
async def set_sick_leave(
    worker_id: int,
    body: SickLeaveRequest,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a worker on sick leave for a date range. Admin only.
    Sets worker is_available=False and marks all their shifts in that range as Unassigned (worker_id cleared).
    """
    result = await db.execute(select(Worker).where(Worker.id == worker_id).where(Worker.deleted_at.is_(None)))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    start_dt = datetime.combine(body.start_date, datetime.min.time(), tzinfo=timezone.utc)
    end_dt = datetime.combine(body.end_date, datetime.max.time().replace(microsecond=0), tzinfo=timezone.utc)
    # Shifts assigned to this worker in [start_date, end_date] that are not already Cancelled
    q = (
        select(Shift)
        .where(Shift.worker_id == worker_id)
        .where(Shift.deleted_at.is_(None))
        .where(Shift.status != ShiftStatus.CANCELLED)
        .where(Shift.start_time >= start_dt)
        .where(Shift.start_time <= end_dt)
    )
    result = await db.execute(q)
    shifts = result.scalars().all()
    for s in shifts:
        s.status = ShiftStatus.UNASSIGNED
        s.worker_id = None
    worker.is_available = False
    await db.flush()
    return SickLeaveResponse(
        worker_id=worker_id,
        is_available=False,
        shifts_marked_unassigned=len(shifts),
    )


@router.post("", response_model=WorkerResponse, status_code=201)
async def create_worker(
    body: WorkerCreate,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new worker. Admin only."""
    from geoalchemy2 import WKTElement

    wkt = None
    if body.current_location:
        wkt = WKTElement(
            f"POINT({body.current_location.longitude} {body.current_location.latitude})",
            srid=4326,
        )
    worker = Worker(
        name=body.name,
        email=body.email,
        role=body.role,
        contract_hours=body.contract_hours,
        current_location=wkt,
    )
    db.add(worker)
    await db.flush()
    await db.refresh(worker)
    return _worker_to_response(worker)


@router.patch("/{worker_id}", response_model=WorkerResponse)
async def update_worker(
    worker_id: int,
    body: WorkerUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Update a worker. Admin: any. Worker: only own profile (e.g. update current_location).
    """
    if current_user.role == WorkerRole.WORKER and worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: cannot update another worker's data")
    from geoalchemy2 import WKTElement

    result = await db.execute(select(Worker).where(Worker.id == worker_id).where(Worker.deleted_at.is_(None)))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    data = body.model_dump(exclude_unset=True)
    if "current_location" in data:
        loc = data.pop("current_location")
        worker.current_location = (
            WKTElement(f"POINT({loc['longitude']} {loc['latitude']})", srid=4326) if loc else None
        )
    for key, value in data.items():
        setattr(worker, key, value)
    await db.flush()
    await db.refresh(worker)
    return _worker_to_response(worker)


@router.delete("/{worker_id}", status_code=204)
async def soft_delete_worker(
    worker_id: int,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a worker (GDPR: data retained for audit). Admin only."""
    from datetime import datetime, timezone

    result = await db.execute(select(Worker).where(Worker.id == worker_id).where(Worker.deleted_at.is_(None)))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    worker.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return None
