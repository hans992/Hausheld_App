"""Client CRUD API. RBAC: Admin sees all; Worker sees only clients linked to their assigned shifts."""
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import AdminUser, CurrentUser
from app.database import get_db
from app.models.client import Client
from app.models.shift import Shift, ShiftStatus
from app.models.worker import WorkerRole
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.services.audit import log_audit
from app.utils.geo import point_from_geometry
from app.utils.crypto import decrypt_value, encrypt_value
from app.models.audit_log import AuditAction, AuditTargetType

router = APIRouter(prefix="/clients", tags=["clients"])

# Phase 5: budget alert threshold (remaining < 15% of monthly_budget)
BUDGET_ALERT_THRESHOLD = 0.15


class BudgetDeductionItem(BaseModel):
    shift_id: int
    date: str  # ISO date
    duration_hours: float
    cost: Decimal


class BudgetStatusResponse(BaseModel):
    client_id: int
    month: str  # YYYY-MM
    monthly_budget: Decimal
    total_deducted: Decimal
    remaining_budget: Decimal
    deductions: list[BudgetDeductionItem]
    budget_alert: bool = Field(..., description="True if remaining_budget < 15% of monthly_budget")


def _client_to_response(c: Client) -> ClientResponse:
    """Build response with decrypted health data (insurance_number, care_level)."""
    raw_care = getattr(c, "care_level", None) or ""
    try:
        care_level = int(decrypt_value(raw_care))
    except (ValueError, TypeError):
        care_level = 1
    return ClientResponse(
        id=c.id,
        name=c.name,
        address=c.address,
        insurance_provider=c.insurance_provider,
        insurance_number=decrypt_value(c.insurance_number) if c.insurance_number else None,
        care_level=care_level,
        monthly_budget=c.monthly_budget,
        address_location=point_from_geometry(c.address_location),
        created_at=c.created_at,
        updated_at=c.updated_at,
        deleted_at=c.deleted_at,
    )


def _client_ids_for_worker(db: AsyncSession, worker_id: int):
    """Distinct client_ids from non-deleted shifts assigned to this worker."""
    q = (
        select(Shift.client_id)
        .where(Shift.worker_id == worker_id)
        .where(Shift.deleted_at.is_(None))
        .distinct()
    )
    return q


@router.get("", response_model=list[ClientResponse])
async def list_clients(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    include_deleted: bool = Query(False, description="Include soft-deleted clients (Admin only)"),
):
    """
    List clients. Admin: all. Worker: only clients linked to their assigned shifts.
    """
    if current_user.role == WorkerRole.ADMIN:
        q = select(Client)
        if not include_deleted:
            q = q.where(Client.deleted_at.is_(None))
        q = q.order_by(Client.id)
        result = await db.execute(q)
        clients = result.scalars().all()
        return [_client_to_response(c) for c in clients]
    # Worker: only clients that appear in their shifts
    subq = _client_ids_for_worker(db, current_user.id)
    result = await db.execute(subq)
    ids = [r[0] for r in result.all()]
    if not ids:
        return []
    q = select(Client).where(Client.id.in_(ids))
    if not include_deleted:
        q = q.where(Client.deleted_at.is_(None))
    q = q.order_by(Client.id)
    result = await db.execute(q)
    clients = result.scalars().all()
    return [_client_to_response(c) for c in clients]


@router.get("/budget-alerts", response_model=list[BudgetStatusResponse])
async def list_budget_alerts(
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
    month: str = Query(..., description="Month as YYYY-MM"),
):
    """
    Admin only. Returns clients whose remaining budget for the month is below 15%.
    """
    result = await db.execute(select(Client).where(Client.deleted_at.is_(None)))
    clients = result.scalars().all()
    try:
        year, month_num = _parse_month(month)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    month_start = datetime(year, month_num, 1, tzinfo=timezone.utc)
    if month_num == 12:
        month_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        month_end = datetime(year, month_num + 1, 1, tzinfo=timezone.utc)
    out: list[BudgetStatusResponse] = []
    for client in clients:
        q = (
            select(Shift)
            .where(Shift.client_id == client.id)
            .where(Shift.deleted_at.is_(None))
            .where(Shift.status == ShiftStatus.COMPLETED)
            .where(Shift.cost.isnot(None))
            .where(Shift.start_time >= month_start)
            .where(Shift.start_time < month_end)
        )
        result = await db.execute(q)
        shifts = result.scalars().all()
        total_deducted = sum((s.cost or Decimal("0")) for s in shifts)
        remaining = client.monthly_budget - total_deducted
        if remaining < client.monthly_budget * Decimal(str(BUDGET_ALERT_THRESHOLD)):
            deductions = [
                BudgetDeductionItem(
                    shift_id=s.id,
                    date=s.start_time.date().isoformat(),
                    duration_hours=round((s.end_time - s.start_time).total_seconds() / 3600.0, 2),
                    cost=s.cost or Decimal("0"),
                )
                for s in shifts
            ]
            out.append(
                BudgetStatusResponse(
                    client_id=client.id,
                    month=month,
                    monthly_budget=client.monthly_budget,
                    total_deducted=total_deducted,
                    remaining_budget=remaining,
                    deductions=deductions,
                    budget_alert=True,
                )
            )
    return out


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    include_deleted: bool = Query(False, description="Allow returning soft-deleted client (Admin only)"),
):
    """
    Get one client by id. Admin: any. Worker: only if client is in their assigned shifts; else 403.
    """
    if current_user.role == WorkerRole.WORKER:
        subq = select(Shift.client_id).where(
            Shift.worker_id == current_user.id,
            Shift.client_id == client_id,
            Shift.deleted_at.is_(None),
        ).limit(1)
        result = await db.execute(subq)
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=403, detail="Forbidden: client not in your assigned shifts")
    q = select(Client).where(Client.id == client_id)
    if not include_deleted:
        q = q.where(Client.deleted_at.is_(None))
    result = await db.execute(q)
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await log_audit(db, current_user.id, AuditAction.VIEW, AuditTargetType.CLIENT, client_id)
    return _client_to_response(client)


def _parse_month(month_str: str) -> tuple[int, int]:
    """Parse YYYY-MM to (year, month). Raises ValueError if invalid."""
    parts = month_str.strip().split("-")
    if len(parts) != 2:
        raise ValueError("month must be YYYY-MM")
    year, month = int(parts[0]), int(parts[1])
    if not (1 <= month <= 12):
        raise ValueError("month must be 01-12")
    return year, month


@router.get("/{client_id}/budget-status", response_model=BudgetStatusResponse)
async def get_budget_status(
    client_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    month: str = Query(..., description="Month as YYYY-MM (e.g. 2025-02)"),
):
    """
    Remaining monthly budget and list of deductions for the given month.
    budget_alert is True when remaining_budget < 15% of monthly_budget.
    Admin: any client. Worker: only clients in their assigned shifts.
    """
    if current_user.role == WorkerRole.WORKER:
        subq = select(Shift.client_id).where(
            Shift.worker_id == current_user.id,
            Shift.client_id == client_id,
            Shift.deleted_at.is_(None),
        ).limit(1)
        result = await db.execute(subq)
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=403, detail="Forbidden: client not in your assigned shifts")
    result = await db.execute(select(Client).where(Client.id == client_id).where(Client.deleted_at.is_(None)))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
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
        .where(Shift.client_id == client_id)
        .where(Shift.deleted_at.is_(None))
        .where(Shift.status == ShiftStatus.COMPLETED)
        .where(Shift.cost.isnot(None))
        .where(Shift.start_time >= month_start)
        .where(Shift.start_time < month_end)
        .order_by(Shift.start_time.asc())
    )
    result = await db.execute(q)
    shifts = result.scalars().all()
    total_deducted = sum((s.cost or Decimal("0")) for s in shifts)
    remaining = client.monthly_budget - total_deducted
    threshold = client.monthly_budget * Decimal(str(BUDGET_ALERT_THRESHOLD))
    budget_alert = remaining < threshold
    deductions = [
        BudgetDeductionItem(
            shift_id=s.id,
            date=s.start_time.date().isoformat(),
            duration_hours=round((s.end_time - s.start_time).total_seconds() / 3600.0, 2),
            cost=s.cost or Decimal("0"),
        )
        for s in shifts
    ]
    return BudgetStatusResponse(
        client_id=client_id,
        month=month,
        monthly_budget=client.monthly_budget,
        total_deducted=total_deducted,
        remaining_budget=remaining,
        deductions=deductions,
        budget_alert=budget_alert,
    )


@router.post("", response_model=ClientResponse, status_code=201)
async def create_client(
    body: ClientCreate,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new client. Admin only."""
    from geoalchemy2 import WKTElement

    loc = None
    if body.address_location:
        loc = WKTElement(
            f"POINT({body.address_location.longitude} {body.address_location.latitude})",
            srid=4326,
        )
    client = Client(
        name=body.name,
        address=body.address,
        insurance_provider=body.insurance_provider,
        insurance_number=encrypt_value(body.insurance_number) if body.insurance_number else None,
        care_level=encrypt_value(str(body.care_level)),
        monthly_budget=body.monthly_budget,
        address_location=loc,
    )
    db.add(client)
    await db.flush()
    await db.refresh(client)
    await log_audit(db, current_user.id, AuditAction.CREATE, AuditTargetType.CLIENT, client.id)
    return _client_to_response(client)


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    body: ClientUpdate,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Update a client. Admin only."""
    from geoalchemy2 import WKTElement

    result = await db.execute(select(Client).where(Client.id == client_id).where(Client.deleted_at.is_(None)))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    data = body.model_dump(exclude_unset=True)
    if "address_location" in data:
        loc = data.pop("address_location")
        client.address_location = (
            WKTElement(f"POINT({loc['longitude']} {loc['latitude']})", srid=4326) if loc else None
        )
    if "insurance_number" in data:
        data["insurance_number"] = encrypt_value(data["insurance_number"]) if data["insurance_number"] else None
    if "care_level" in data:
        data["care_level"] = encrypt_value(str(data["care_level"]))
    for key, value in data.items():
        setattr(client, key, value)
    await db.flush()
    await db.refresh(client)
    await log_audit(db, current_user.id, AuditAction.UPDATE, AuditTargetType.CLIENT, client_id)
    return _client_to_response(client)


@router.delete("/{client_id}", status_code=204)
async def soft_delete_client(
    client_id: int,
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a client (GDPR: data retained for audit). Admin only."""
    result = await db.execute(select(Client).where(Client.id == client_id).where(Client.deleted_at.is_(None)))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await log_audit(db, current_user.id, AuditAction.DELETE, AuditTargetType.CLIENT, client_id, details="soft_delete")
    client.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return None
