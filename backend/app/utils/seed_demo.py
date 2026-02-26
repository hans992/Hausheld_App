"""
Seed a demo dataset for local development and UI demos.

Creates:
1) 13 Workers: 1 Admin (admin@demo.com) + 12 Workers across NRW cities (all with current_location for map)
2) 25 Clients with varied Krankenkassen, Pflegegrad (1-5), and 4-6 facility-style; all with address_location for heatmap
3) 20+ Shifts: mix of Scheduled / In_Progress / Unassigned and Completed with mock signature keys
4) Budget alerts: completed shifts with costs high enough to trigger remaining_budget < 15% for some clients
5) Map data: every client has address_location (PostGIS point), every worker has current_location — heatmap and worker pins will show on Map page after seed

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
    "Wuppertal": Point(lon=7.0982, lat=51.2562),
    "Münster": Point(lon=7.6281, lat=51.9607),
}

# German health insurers (Krankenkassen) for variety across clients
INSURANCES: list[str] = [
    "AOK Rheinland/Hamburg",
    "AOK NORDWEST",
    "TK",
    "Barmer",
    "DAK-Gesundheit",
    "IKK classic",
    "BKK Mobil Oil",
    "Techniker Krankenkasse",
    "Knappschaft",
    "HEK",
    "Viactiv",
    "BARMER",
]


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
        worker_koeln = Worker(
            name="Demo Worker Köln",
            email="worker-koeln@demo.com",
            role=WorkerRole.WORKER,
            contract_hours=40,
            current_location=_pt(NRW_POINTS["Köln"]),
            is_available=True,
        )
        worker_dortmund = Worker(
            name="Demo Worker Dortmund",
            email="worker-dortmund@demo.com",
            role=WorkerRole.WORKER,
            contract_hours=20,
            current_location=_pt(NRW_POINTS["Dortmund"]),
            is_available=True,
        )
        worker_bochum = Worker(
            name="Demo Worker Bochum",
            email="worker-bochum@demo.com",
            role=WorkerRole.WORKER,
            contract_hours=40,
            current_location=_pt(NRW_POINTS["Bochum"]),
            is_available=True,
        )
        worker_wuppertal = Worker(
            name="Demo Worker Wuppertal",
            email="worker-wuppertal@demo.com",
            role=WorkerRole.WORKER,
            contract_hours=20,
            current_location=_pt(NRW_POINTS["Wuppertal"]),
            is_available=True,
        )
        worker_muenster = Worker(
            name="Demo Worker Münster",
            email="worker-muenster@demo.com",
            role=WorkerRole.WORKER,
            contract_hours=40,
            current_location=_pt(NRW_POINTS["Münster"]),
            is_available=True,
        )
        worker_essen2 = Worker(
            name="Demo Worker Essen 2",
            email="worker-essen2@demo.com",
            role=WorkerRole.WORKER,
            contract_hours=20,
            current_location=_pt(NRW_POINTS["Essen"]),
            is_available=True,
        )
        worker_koeln2 = Worker(
            name="Demo Worker Köln 2",
            email="worker-koeln2@demo.com",
            role=WorkerRole.WORKER,
            contract_hours=40,
            current_location=_pt(NRW_POINTS["Köln"]),
            is_available=False,  # sick leave demo
        )
        worker_dortmund2 = Worker(
            name="Demo Worker Dortmund 2",
            email="worker-dortmund2@demo.com",
            role=WorkerRole.WORKER,
            contract_hours=40,
            current_location=_pt(NRW_POINTS["Dortmund"]),
            is_available=True,
        )
        worker_bochum2 = Worker(
            name="Demo Worker Bochum 2",
            email="worker-bochum2@demo.com",
            role=WorkerRole.WORKER,
            contract_hours=20,
            current_location=_pt(NRW_POINTS["Bochum"]),
            is_available=False,  # sick leave demo
        )
        all_workers = [
            admin,
            worker_essen,
            worker_duesseldorf,
            worker_koeln,
            worker_dortmund,
            worker_bochum,
            worker_wuppertal,
            worker_muenster,
            worker_essen2,
            worker_koeln2,
            worker_dortmund2,
            worker_bochum2,
        ]
        db.add_all(all_workers)
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
            # --- Facility-style clients (Krankenhäuser / Pflegeheime) ---
            Client(
                name="Demo Krankenhaus Essen Mitte",
                address="Hufelandstr. 55, 45147 Essen, NRW",
                insurance_provider=INSURANCES[0],
                insurance_number=encrypt_value("AOK-DEMO-KH-ESSEN"),
                care_level=encrypt_value("3"),
                monthly_budget=Decimal("131.00"),
                address_location=_pt(NRW_POINTS["Essen"]),
            ),
            Client(
                name="Demo Pflegeheim Köln-Nord",
                address="Neusser Str. 450, 50733 Köln, NRW",
                insurance_provider=INSURANCES[2],
                insurance_number=encrypt_value("TK-DEMO-PFLEGE-KOELN"),
                care_level=encrypt_value("4"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Köln"]),
            ),
            Client(
                name="Demo Reha-Zentrum Düsseldorf",
                address="Ludenberger Str. 30, 40629 Düsseldorf, NRW",
                insurance_provider=INSURANCES[3],
                insurance_number=encrypt_value("BARMER-DEMO-REHA-DUS"),
                care_level=encrypt_value("2"),
                monthly_budget=Decimal("131.00"),
                address_location=_pt(NRW_POINTS["Düsseldorf"]),
            ),
            Client(
                name="Demo Seniorenresidenz Dortmund",
                address="Ruhrallee 12, 44139 Dortmund, NRW",
                insurance_provider=INSURANCES[4],
                insurance_number=encrypt_value("DAK-DEMO-SEN-DORTMUND"),
                care_level=encrypt_value("5"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Dortmund"]),
            ),
            Client(
                name="Demo Klinik Bochum",
                address="Bergstr. 26, 44791 Bochum, NRW",
                insurance_provider=INSURANCES[7],
                insurance_number=encrypt_value("TK-DEMO-KLINIK-BOCHUM"),
                care_level=encrypt_value("3"),
                monthly_budget=Decimal("131.00"),
                address_location=_pt(NRW_POINTS["Bochum"]),
            ),
            Client(
                name="Demo Pflegeheim Wuppertal",
                address="Elberfelder Str. 75, 42103 Wuppertal, NRW",
                insurance_provider=INSURANCES[8],
                insurance_number=encrypt_value("KNAPP-DEMO-PFLEGE-WUP"),
                care_level=encrypt_value("4"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Wuppertal"]),
            ),
            # --- Additional private clients (14 more to reach 25 total) ---
            Client(
                name="Demo Client Essen Nord (Pflegegrad 1)",
                address="Altenessener Str. 400, 45329 Essen, NRW",
                insurance_provider=INSURANCES[5],
                insurance_number=encrypt_value("IKK-DEMO-ESSEN-NORD"),
                care_level=encrypt_value("1"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Essen"]),
            ),
            Client(
                name="Demo Client Düsseldorf Süd (Pflegegrad 2)",
                address="Benrather Str. 8, 40213 Düsseldorf, NRW",
                insurance_provider=INSURANCES[6],
                insurance_number=encrypt_value("BKK-DEMO-DUS-SUD"),
                care_level=encrypt_value("2"),
                monthly_budget=Decimal("131.00"),
                address_location=_pt(NRW_POINTS["Düsseldorf"]),
            ),
            Client(
                name="Demo Client Köln West (Pflegegrad 4)",
                address="Venloer Str. 250, 50823 Köln, NRW",
                insurance_provider=INSURANCES[9],
                insurance_number=encrypt_value("HEK-DEMO-KOELN-WEST"),
                care_level=encrypt_value("4"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Köln"]),
            ),
            Client(
                name="Demo Client Dortmund Ost (Pflegegrad 3)",
                address="Schützenstr. 45, 44147 Dortmund, NRW",
                insurance_provider=INSURANCES[10],
                insurance_number=encrypt_value("VIACTIV-DEMO-DORTMUND"),
                care_level=encrypt_value("3"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Dortmund"]),
            ),
            Client(
                name="Demo Client Bochum Süd (Pflegegrad 2)",
                address="Hattinger Str. 300, 44795 Bochum, NRW",
                insurance_provider=INSURANCES[11],
                insurance_number=encrypt_value("BARMER-DEMO-BOCHUM-SUD"),
                care_level=encrypt_value("2"),
                monthly_budget=Decimal("131.00"),
                address_location=_pt(NRW_POINTS["Bochum"]),
            ),
            Client(
                name="Demo Client Wuppertal (Pflegegrad 5)",
                address="Friedrich-Engels-Allee 100, 42285 Wuppertal, NRW",
                insurance_provider=INSURANCES[0],
                insurance_number=encrypt_value("AOK-DEMO-WUPPERTAL"),
                care_level=encrypt_value("5"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Wuppertal"]),
            ),
            Client(
                name="Demo Client Münster (Pflegegrad 1)",
                address="Ludgeristr. 60, 48143 Münster, NRW",
                insurance_provider=INSURANCES[1],
                insurance_number=encrypt_value("AOK-NW-DEMO-MUENSTER"),
                care_level=encrypt_value("1"),
                monthly_budget=Decimal("131.00"),
                address_location=_pt(NRW_POINTS["Münster"]),
            ),
            Client(
                name="Demo Client Essen Süd (Pflegegrad 3)",
                address="Steeler Str. 200, 45136 Essen, NRW",
                insurance_provider=INSURANCES[2],
                insurance_number=encrypt_value("TK-DEMO-ESSEN-SUD"),
                care_level=encrypt_value("3"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Essen"]),
            ),
            Client(
                name="Demo Client Düsseldorf Ost (Pflegegrad 4)",
                address="Oberkasseler Str. 88, 40545 Düsseldorf, NRW",
                insurance_provider=INSURANCES[3],
                insurance_number=encrypt_value("BARMER-DEMO-DUS-OST"),
                care_level=encrypt_value("4"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Düsseldorf"]),
            ),
            Client(
                name="Demo Client Köln Süd (Pflegegrad 2)",
                address="Bonner Str. 150, 50968 Köln, NRW",
                insurance_provider=INSURANCES[4],
                insurance_number=encrypt_value("DAK-DEMO-KOELN-SUD"),
                care_level=encrypt_value("2"),
                monthly_budget=Decimal("131.00"),
                address_location=_pt(NRW_POINTS["Köln"]),
            ),
            Client(
                name="Demo Client Dortmund West (Pflegegrad 5)",
                address="Münsterstr. 250, 44145 Dortmund, NRW",
                insurance_provider=INSURANCES[5],
                insurance_number=encrypt_value("IKK-DEMO-DORTMUND-WEST"),
                care_level=encrypt_value("5"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Dortmund"]),
            ),
            Client(
                name="Demo Client Bochum Nord (Pflegegrad 1)",
                address="Ostring 25, 44787 Bochum, NRW",
                insurance_provider=INSURANCES[6],
                insurance_number=encrypt_value("BKK-DEMO-BOCHUM-NORD"),
                care_level=encrypt_value("1"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Bochum"]),
            ),
            Client(
                name="Demo Client Wuppertal Nord (Pflegegrad 3)",
                address="Gathe 55, 42107 Wuppertal, NRW",
                insurance_provider=INSURANCES[7],
                insurance_number=encrypt_value("TK-DEMO-WUPPERTAL-NORD"),
                care_level=encrypt_value("3"),
                monthly_budget=Decimal("131.00"),
                address_location=_pt(NRW_POINTS["Wuppertal"]),
            ),
            Client(
                name="Demo Client Münster Süd (Pflegegrad 4)",
                address="Weseler Str. 100, 48155 Münster, NRW",
                insurance_provider=INSURANCES[8],
                insurance_number=encrypt_value("KNAPP-DEMO-MUENSTER-SUD"),
                care_level=encrypt_value("4"),
                monthly_budget=Decimal("125.00"),
                address_location=_pt(NRW_POINTS["Münster"]),
            ),
        ]
        db.add_all(clients)
        await db.flush()

        # --- Shifts ---
        c_essen, c_dus, c_koeln, c_dortmund, c_bochum = clients[0], clients[1], clients[2], clients[3], clients[4]
        # Facility and extra clients for more shifts
        c_kh_essen, c_pflege_koeln, c_reha_dus = clients[5], clients[6], clients[7]
        c_senioren_dortmund, c_klinik_bochum = clients[8], clients[9]
        c_essen_nord, c_dus_sud, c_koeln_west = clients[11], clients[12], clients[13]

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

        # Additional shifts with new workers and clients
        shifts += [
            mk_shift(
                worker=worker_koeln,
                client=c_pflege_koeln,
                start=tomorrow_9 + timedelta(days=1, hours=2),
                end=tomorrow_9 + timedelta(days=1, hours=4),
                status=ShiftStatus.SCHEDULED,
                tasks="Cleaning,Care",
            ),
            mk_shift(
                worker=worker_dortmund,
                client=c_senioren_dortmund,
                start=tomorrow_9 + timedelta(days=2),
                end=tomorrow_9 + timedelta(days=2, hours=3),
                status=ShiftStatus.SCHEDULED,
                tasks="Chores,Companion",
            ),
            mk_shift(
                worker=worker_bochum,
                client=c_klinik_bochum,
                start=tomorrow_9 + timedelta(days=3, hours=2),
                end=tomorrow_9 + timedelta(days=3, hours=5),
                status=ShiftStatus.SCHEDULED,
                tasks="Support",
            ),
            mk_shift(
                worker=worker_muenster,
                client=clients[20],
                start=tomorrow_9 + timedelta(days=4),
                end=tomorrow_9 + timedelta(days=4, hours=2),
                status=ShiftStatus.SCHEDULED,
                tasks="Cleaning,Shopping",
            ),
            mk_shift(
                worker=worker_essen2,
                client=c_essen_nord,
                start=tomorrow_9 + timedelta(days=5),
                end=tomorrow_9 + timedelta(days=5, hours=2),
                status=ShiftStatus.SCHEDULED,
                tasks="Cleaning",
            ),
            mk_shift(
                worker=worker_dortmund2,
                client=c_koeln_west,
                start=tomorrow_9 + timedelta(days=5, hours=1),
                end=tomorrow_9 + timedelta(days=5, hours=4),
                status=ShiftStatus.SCHEDULED,
                tasks="Cooking,Chores",
            ),
            mk_shift(
                worker=None,
                client=c_reha_dus,
                start=tomorrow_9 + timedelta(days=6),
                end=tomorrow_9 + timedelta(days=6, hours=3),
                status=ShiftStatus.UNASSIGNED,
                tasks="Care",
            ),
            mk_shift(
                worker=None,
                client=c_kh_essen,
                start=tomorrow_9 + timedelta(days=7, hours=2),
                end=tomorrow_9 + timedelta(days=7, hours=5),
                status=ShiftStatus.UNASSIGNED,
                tasks="Support",
            ),
        ]

        # Ensure we have a good number of shifts (18+)
        assert len(shifts) >= 18, f"Expected at least 18 shifts, got {len(shifts)}"
        num_shifts = len(shifts)

        db.add_all(shifts)
        await db.commit()

    print("Demo seed complete:")
    print("  - Workers: 13 (1 Admin + 12 Workers across NRW; 2 on sick leave; all have current_location for map)")
    print("  - Clients: 25 (5 original + 6 facilities/Krankenhäuser + 14 private; varied Krankenkassen; all have address_location for heatmap)")
    print(f"  - Shifts: {num_shifts} (mix of Scheduled, In Progress, Unassigned, Completed; 2 Completed with budget alerts)")
    print("  - Budget alerts: triggered for Essen + Düsseldorf demo clients in the current month")
    print("  - Map data: clients and workers have geo coordinates — run Admin Map page to see heatmap and worker pins")


def main() -> None:
    asyncio.run(seed_demo())


if __name__ == "__main__":
    main()

