"""Dashboard stats API: weekly trends, city distribution, budget usage, KPIs."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import CurrentUser
from app.database import get_db
from app.models.client import Client
from app.models.shift import Shift, ShiftStatus
from app.models.worker import Worker

router = APIRouter(tags=["stats"])


def _month_bounds(utc_now: datetime):
    """Current month start and end in UTC."""
    start = utc_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if utc_now.month == 12:
        end = start.replace(year=start.year + 1, month=1) - timedelta(microseconds=1)
    else:
        end = start.replace(month=start.month + 1) - timedelta(microseconds=1)
    return start, end


@router.get("/dashboard-summary")
async def get_dashboard_summary(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Aggregated stats for dashboard: weekly shift trends, city distribution,
    budget usage, KPIs (active workers, clients, monthly revenue), top workers by completed shifts.
    """
    now = datetime.now(timezone.utc)
    month_start, month_end = _month_bounds(now)

    # --- Weekly shift trends: last 7 days, count per day ---
    daily_counts: list[dict] = []
    for i in range(6, -1, -1):
        d = (now - timedelta(days=i)).date()
        day_start = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        q = (
            select(func.count(Shift.id))
            .where(Shift.deleted_at.is_(None))
            .where(Shift.start_time >= day_start)
            .where(Shift.start_time < day_end)
        )
        result = await db.execute(q)
        count = result.scalar() or 0
        daily_counts.append({"date": d.isoformat(), "count": count})

    # --- City distribution: active clients in Essen, Düsseldorf, Köln ---
    cities = ["Essen", "Düsseldorf", "Köln"]
    city_distribution: list[dict] = []
    for city in cities:
        q = (
            select(func.count(Client.id))
            .where(Client.deleted_at.is_(None))
            .where(Client.address.ilike(f"%{city}%"))
        )
        result = await db.execute(q)
        city_distribution.append({"name": city, "value": result.scalar() or 0})

    # --- Budget usage: total spent vs total allocated (current month) ---
    # Total allocated = sum of monthly_budget for all non-deleted clients
    q_allocated = select(func.coalesce(func.sum(Client.monthly_budget), 0)).where(
        Client.deleted_at.is_(None)
    )
    result = await db.execute(q_allocated)
    total_allocated = float(result.scalar() or 0)

    # Total spent = sum of shift costs for completed shifts in current month
    q_spent = (
        select(func.coalesce(func.sum(Shift.cost), 0))
        .where(Shift.deleted_at.is_(None))
        .where(Shift.status == ShiftStatus.COMPLETED)
        .where(Shift.start_time >= month_start)
        .where(Shift.start_time <= month_end)
        .where(Shift.cost.isnot(None))
    )
    result = await db.execute(q_spent)
    total_spent = float(result.scalar() or 0)

    budget_usage = {"total_spent": total_spent, "total_allocated": total_allocated}

    # --- KPIs ---
    q_workers = select(func.count(Worker.id)).where(Worker.deleted_at.is_(None))
    result = await db.execute(q_workers)
    total_active_workers = result.scalar() or 0

    q_clients = select(func.count(Client.id)).where(Client.deleted_at.is_(None))
    result = await db.execute(q_clients)
    total_clients = result.scalar() or 0

    monthly_revenue = total_spent  # revenue = sum of completed shift costs this month

    # --- Top 5 workers by completed shifts this month ---
    q_top = (
        select(Worker.name, func.count(Shift.id).label("count"))
        .select_from(Worker)
        .join(Shift, Shift.worker_id == Worker.id)
        .where(Worker.deleted_at.is_(None))
        .where(Shift.deleted_at.is_(None))
        .where(Shift.status == ShiftStatus.COMPLETED)
        .where(Shift.start_time >= month_start)
        .where(Shift.start_time <= month_end)
        .group_by(Worker.id, Worker.name)
        .order_by(func.count(Shift.id).desc())
        .limit(5)
    )
    result = await db.execute(q_top)
    top_workers = [{"name": row[0], "value": row[1]} for row in result.all()]

    return {
        "weekly_shift_trends": daily_counts,
        "city_distribution": city_distribution,
        "budget_usage": budget_usage,
        "total_active_workers": total_active_workers,
        "total_clients": total_clients,
        "monthly_revenue": monthly_revenue,
        "top_workers_completed_shifts": top_workers,
    }
