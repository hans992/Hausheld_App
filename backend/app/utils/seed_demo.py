"""
Seed a demo dataset for local development and UI demos.

Creates:
1) 3 Workers: 1 Admin (admin@demo.com) + 2 Workers in Essen and Düsseldorf
2) 5 Clients with realistic Pflegegrad (1-5) and NRW addresses
3) 10 Shifts: mix of Scheduled / In_Progress / Unassigned and 2 Completed with mock signature keys
4) Budget alerts: completed shifts with costs high enough to trigger remaining_budget < 15% for a few clients

Usage:
  python -m app.utils.seed_demo

Prerequisites:
  - Database is reachable via DATABASE_URL / settings.database_url
  - Alembic migrations have been applied (tables exist)
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from geoalchemy2 import WKTElement
from sqlalchemy import delete, select

from app.database import AsyncSessionLocal
from app.models.client import Client
from app.models.shift import Shift, ShiftStatus
from app.models.worker import Worker, WorkerRole
from app.utils.crypto import encrypt_value


@dataclass(frozen=True)
class Point:
    lon: float
    lat: float


NRW_POINTS: dict[str, Point] = {
    "Essen": Point(lon=7.0116, lat=51.4556),
    "Düsseldorf": Point(lon=6.7735, lat=51.2277),
    "Köln": Point(lon=6.9603, lat=50.9375),
    "Dortmund": Point(lon=7.4660, lat=51.5136),
    "Bochum": Point(lon=7.2162, lat=51.4818),
}


def _pt(p: Point) -> WKTElement:
    return WKTElement(f"POINT({p.lon} {p.lat})", srid=4326)


def _utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


async def seed_demo() -> None:
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    async with AsyncSessionLocal() as db:
        # --- Clean previous demo data (idempotent) ---
        demo_worker_ids = (
            (await db.execute(select(Worker.id).where(Worker.email.ilike("%@demo.com%"))))
            .scalars()
            .all()
        )
        demo_client_ids = (
            (await db.execute(select(Client.id).where(Client.name.ilike("Demo %"))))
            .scalars()
            .all()
        )

        # Delete shifts first (Client FK is RESTRICT)
        if demo_client_ids:
            await db.execute(delete(Shift).where(Shift.client_id.in_(demo_client_ids)))
        if demo_worker_ids:
            await db.execute(delete(Shift).where(Shift.worker_id.in_(demo_worker_ids)))
        if demo_client_ids:
            await db.execute(delete(Client).where(Client.id.in_(demo_client_ids)))
        if demo_worker_ids:
            await db.execute(delete(Worker).where(Worker.id.in_(demo_worker_ids)))
        await db.commit()

        # --- Workers ---
        admin = Worker(
            name="Demo Admin",
            email="admin@demo.com",
            role=WorkerRole.ADMIN,
            contract_hours=40,
            current_location=_pt(NRW_POINTS["Düsseldorf"]),
            is_available=True,
        )
        worker_essen = Worker(
            name="Demo Worker Essen",
            email="worker-essen@demo.com",
            role=WorkerRole.WORKER,
            contract_hours=40,
            current_location=_pt(NRW_POINTS["Essen"]),
            is_available=True,
        )
        worker_duesseldorf = Worker(
            name="Demo Worker Düsseldorf",
            email="worker-duesseldorf@demo.com",
            role=WorkerRole.WORKER,
            contract_hours=40,
            current_location=_pt(NRW_POINTS["Düsseldorf"]),
            is_available=True,
        )
        db.add_all([admin, worker_essen, worker_duesseldorf])
        await db.flush()  # ids

        # --- Clients (NRW) ---
        clients: list[Client] = [
            Client(
                name="Demo Client Essen (Pflegegrad 2)",
                address="Rüttenscheider Str. 62, 45130 Essen, NRW",
                insurance_provider="AOK Rheinland/Hamburg",
                insurance_number=encrypt_value("AOK-DEMO-ESSEN-0001"),
                care_level=encrypt_value("2"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Essen"]),
            ),
            Client(
                name="Demo Client Düsseldorf (Pflegegrad 3)",
                address="Königsallee 2, 40212 Düsseldorf, NRW",
                insurance_provider="TK",
                insurance_number=encrypt_value("TK-DEMO-DUS-0002"),
                care_level=encrypt_value("3"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Düsseldorf"]),
            ),
            Client(
                name="Demo Client Köln (Pflegegrad 1)",
                address="Aachener Str. 10, 50674 Köln, NRW",
                insurance_provider="Barmer",
                insurance_number=encrypt_value("BARMER-DEMO-KOELN-0003"),
                care_level=encrypt_value("1"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Köln"]),
            ),
            Client(
                name="Demo Client Dortmund (Pflegegrad 4)",
                address="Westenhellweg 28, 44137 Dortmund, NRW",
                insurance_provider="DAK",
                insurance_number=encrypt_value("DAK-DEMO-DORTMUND-0004"),
                care_level=encrypt_value("4"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Dortmund"]),
            ),
            Client(
                name="Demo Client Bochum (Pflegegrad 5)",
                address="Kortumstr. 55, 44787 Bochum, NRW",
                insurance_provider="IKK classic",
                insurance_number=encrypt_value("IKK-DEMO-BOCHUM-0005"),
                care_level=encrypt_value("5"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Bochum"]),
            ),
        ]
        db.add_all(clients)
        await db.flush()

        # --- Shifts ---
        c_essen, c_dus, c_koeln, c_dortmund, c_bochum = clients

        def mk_shift(
            *,
            worker: Worker | None,
            client: Client,
            start: datetime,
            end: datetime,
            status: ShiftStatus,
            tasks: str,
            check_in: bool = False,
            check_out: bool = False,
            signature_key: str | None = None,
            cost: Decimal | None = None,
        ) -> Shift:
            start = _utc(start)
            end = _utc(end)
            s = Shift(
                worker_id=worker.id if worker else None,
                client_id=client.id,
                start_time=start,
                end_time=end,
                status=status,
                tasks=tasks,
                signature_storage_key=signature_key,
                cost=cost,
            )
            # Provide GPS anchors for demo realism
            if check_in:
                s.check_in_at = start + timedelta(minutes=5)
                s.check_in_location = client.address_location
            if check_out:
                s.check_out_at = end
                s.check_out_location = client.address_location
            return s

        # Two Completed shifts (current month) with high costs to trigger budget alerts (< 15% remaining)
        completed_1_start = month_start + timedelta(days=3, hours=9)
        completed_1_end = completed_1_start + timedelta(hours=3)
        completed_2_start = month_start + timedelta(days=6, hours=10)
        completed_2_end = completed_2_start + timedelta(hours=3)

        shifts: list[Shift] = [
            mk_shift(
                worker=worker_essen,
                client=c_essen,
                start=completed_1_start,
                end=completed_1_end,
                status=ShiftStatus.COMPLETED,
                tasks="Cleaning,Cooking",
                check_in=True,
                check_out=True,
                signature_key="demo/signatures/essen_001.png",
                cost=Decimal("110.00"),  # 125 - 110 = 15 (budget alert)
            ),
            mk_shift(
                worker=worker_duesseldorf,
                client=c_dus,
                start=completed_2_start,
                end=completed_2_end,
                status=ShiftStatus.COMPLETED,
                tasks="Cleaning,Shopping",
                check_in=True,
                check_out=True,
                signature_key="demo/signatures/duesseldorf_002.png",
                cost=Decimal("115.00"),  # 125 - 115 = 10 (budget alert)
            ),
        ]

        # In progress (today)
        ip_start = now - timedelta(hours=1, minutes=30)
        shifts += [
            mk_shift(
                worker=worker_essen,
                client=c_koeln,
                start=ip_start,
                end=ip_start + timedelta(hours=3),
                status=ShiftStatus.IN_PROGRESS,
                tasks="Cleaning",
                check_in=True,
            ),
            mk_shift(
                worker=worker_duesseldorf,
                client=c_dortmund,
                start=ip_start + timedelta(minutes=20),
                end=ip_start + timedelta(hours=3, minutes=20),
                status=ShiftStatus.IN_PROGRESS,
                tasks="Chores,Cooking",
                check_in=True,
            ),
            mk_shift(
                worker=worker_duesseldorf,
                client=c_bochum,
                start=ip_start + timedelta(minutes=40),
                end=ip_start + timedelta(hours=2, minutes=40),
                status=ShiftStatus.IN_PROGRESS,
                tasks="Shopping",
                check_in=True,
            ),
        ]

        # Scheduled (next days)
        tomorrow_9 = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
        shifts += [
            mk_shift(
                worker=worker_essen,
                client=c_essen,
                start=tomorrow_9,
                end=tomorrow_9 + timedelta(hours=2),
                status=ShiftStatus.SCHEDULED,
                tasks="Cleaning",
            ),
            mk_shift(
                worker=worker_duesseldorf,
                client=c_dus,
                start=tomorrow_9 + timedelta(days=1),
                end=tomorrow_9 + timedelta(days=1, hours=2),
                status=ShiftStatus.SCHEDULED,
                tasks="Cooking,Chores",
            ),
            mk_shift(
                worker=worker_essen,
                client=c_koeln,
                start=tomorrow_9 + timedelta(days=2, hours=1),
                end=tomorrow_9 + timedelta(days=2, hours=3),
                status=ShiftStatus.SCHEDULED,
                tasks="Cleaning,Shopping",
            ),
        ]

        # Unassigned (for substitution engine demos)
        shifts += [
            mk_shift(
                worker=None,
                client=c_dortmund,
                start=tomorrow_9 + timedelta(days=3),
                end=tomorrow_9 + timedelta(days=3, hours=2),
                status=ShiftStatus.UNASSIGNED,
                tasks="Cleaning",
            ),
            mk_shift(
                worker=None,
                client=c_bochum,
                start=tomorrow_9 + timedelta(days=4, hours=1),
                end=tomorrow_9 + timedelta(days=4, hours=3, minutes=30),
                status=ShiftStatus.UNASSIGNED,
                tasks="Chores",
            ),
        ]

        # Ensure exactly 10 shifts
        assert len(shifts) == 10, f"Expected 10 shifts, got {len(shifts)}"

        db.add_all(shifts)
        await db.commit()

    print("✅ Demo seed complete:")
    print("  - Workers: admin@demo.com, worker-essen@demo.com, worker-duesseldorf@demo.com")
    print("  - Clients: 5 demo clients (NRW)")
    print("  - Shifts: 10 (includes 2 Completed with signature keys; some Unassigned for substitutions)")
    print("  - Budget alerts: triggered for Essen + Düsseldorf demo clients in the current month")


def main() -> None:
    asyncio.run(seed_demo())


if __name__ == "__main__":
    main()

