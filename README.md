# Hausheld – Technical Case Study

**A distributed home-help workflow platform for NRW (North Rhine-Westphalia)** — workers, clients, shifts, **Entlastungsbetrag** (relief budget), and **Leistungsnachweis** (proof of service) with GPS and digital signatures. Built for portfolio-grade documentation and EU/GDPR awareness.

---

## Technical Architecture & Data Flow

Hausheld is built as a **distributed ecosystem** where **data integrity** and **legal compliance** are the top priorities.

```
┌─────────────────┐     JWT      ┌──────────────────────────────────────────┐
│  Mobile PWA     │◄────────────►│  FastAPI Backend (PostgreSQL + PostGIS)   │
│  (Next.js)      │   Bearer     │  Workers · Clients · Shifts · Audit       │
└─────────────────┘              └──────────────────────────────────────────┘
        │                                          ▲
        │ Schedule, Check-in/out,                   │
        │ Signature Pad                             │
        ▼                                          │
┌─────────────────┐     JWT      ┌─────────────────┐
│  Admin Dashboard│◄────────────►│  Same API       │
│  (Vite + React) │   Bearer     │  Calendar,      │
└─────────────────┘              │  Substitutes,  │
                                  │  Billing, Audit│
                                  └─────────────────┘
```

- **Backend** (`/backend`): FastAPI, SQLAlchemy 2 (async), PostgreSQL + PostGIS, Alembic, Pydantic. Single source of truth; all mutations go through the API with JWT and RBAC.
- **Mobile frontend** (`/frontend`): Next.js PWA (German UI). Workers see their schedule, check in/out with GPS, capture client signatures, view clients linked to their shifts.
- **Admin frontend** (`/admin`): Vite + React desktop app. Calendar, workers (sick leave), clients (budget alerts), billing export (SGB XI CSV), audit log, substitution suggestions.

Data flow is **unidirectional**: frontends call the API; the API enforces roles (Admin vs Worker), encrypts health data at rest, and appends to the audit log on every client access.

---

## Geospatial Intelligence

**PostgreSQL/PostGIS** is used to compute **real-time distances** between clients and workers for **intelligent substitution suggestions**.

- **Worker** and **Client** models store a PostGIS `Point` (WGS84): `current_location` and `address_location`.
- When a shift is **Unassigned** (e.g. worker on sick leave), the Admin Dashboard calls **`GET /shifts/{id}/suggest-substitutes`**. The backend:
  - Uses **`ST_Distance`** (client address ↔ worker current location) to rank candidates.
  - Excludes workers with overlapping shifts and those who would exceed **contract_hours** for that week.
- Result: up to **3 substitute workers** with distance (meters) and remaining capacity, so admins can assign with one click.

This replaces guesswork with **proximity and capacity** and keeps travel time and fairness in mind.

---

## GDPR Compliance by Design

- **Fernet encryption** (symmetric AES) for **health-related fields**: `insurance_number`, `care_level` (Pflegegrad 1–5). Keys are not stored in the DB; set `ENCRYPTION_KEY` in production. In dev, values can be stored in plaintext.
- **Append-only Audit Log**: Every access to client (health) data is recorded in `audit_logs`: **user_id**, **action** (VIEW/CREATE/UPDATE/DELETE), **target_type**, **target_id**, **details**, **created_at**. The audit API is **read-only** (Admin); no POST/PATCH/DELETE so the log stays tamper-proof.
- **Soft deletes** on Workers, Clients, Shifts: only `deleted_at` is set; rows are retained for audit and legal hold. No physical delete of person-related data.
- **Data residency**: Backend and DB are intended for **AWS eu-central-1 (Frankfurt)** so that health data remains in Germany.

See **[GDPR_COMPLIANCE.md](./GDPR_COMPLIANCE.md)** for a short compliance statement suitable for GitHub and EU stakeholders.

---

## State Machine Workflows

Shifts follow a **strict state machine** so that status and proof of service are unambiguous:

- **Scheduled** → worker assigned, not yet started.
- **In_Progress** → worker has called **Check-in** (GPS + timestamp stored). Only **Scheduled** shifts can move to In_Progress.
- **Completed** → worker has called **Check-out** with **GPS + client signature** (stored as image key). Cost is set (duration × hourly rate) for Entlastungsbetrag deduction. Only **In_Progress** shifts can be completed.
- **Unassigned** → e.g. sick leave; no worker. Admin can use **suggest-substitutes** and assign a new worker (PATCH shift).
- **Cancelled** → shift no longer carried out.

**GPS-verified check-ins** replace paper forms: the backend stores `check_in_location` / `check_out_location` (PostGIS) and timestamps, so presence at the client’s location is verifiable for insurers and audits.

---

## Repository Structure

| Path | Stack | Purpose |
|------|--------|--------|
| **`/backend`** | FastAPI, PostGIS, Alembic, SQLAlchemy 2 | API, auth, substitutions, budget, audit, SGB XI export, seed script |
| **`/frontend`** | Next.js, Tailwind, PWA | Mobile worker app (schedule, check-in/out, signature pad) |
| **`/admin`** | Vite, React, Tailwind, FullCalendar | Desktop admin (calendar, workers, clients, billing, audit) |

---

## Quick Start

### 1. Database (PostgreSQL + PostGIS)

```bash
createdb hausheld
psql -d hausheld -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# .venv\Scripts\activate  (Windows) or source .venv/bin/activate (Linux/macOS)
pip install -r requirements.txt
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, AUTH_DEV_MODE=true
alembic upgrade head
python -m app.utils.seed_demo   # Optional: demo workers, clients, shifts
uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000  
- Docs: http://127.0.0.1:8000/docs  

### 3. Frontend (Mobile PWA)

```bash
cd frontend
npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000 → use **Demo Login** (Admin or Worker) to skip manual login. Token is stored in `localStorage`; redirect to `/schedule` after login.

### 4. Admin Dashboard

```bash
cd admin
npm install
# .env: VITE_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:5174 → **Demo Login** as Admin to access calendar, workers, clients, billing, audit.

---

## Demo Mode

For portfolio and local demos, **Demo Login** is available when the backend has `AUTH_DEV_MODE=true`:

- **Mobile**: On the login page, choose **Demo: Admin** or **Demo: Worker**. The app calls `POST /auth/dev-login` with `admin@demo.com` or `worker-essen@demo.com`, stores the JWT, and redirects to the schedule.
- **Admin**: On `/admin/login`, same options; after login, redirect to `/admin`.

Run `python -m app.utils.seed_demo` in the backend so these demo users and sample data exist.

---

## API Overview (selected)

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/dev-login`, `GET /auth/me` |
| Shifts | `GET/PATCH /shifts`, `PATCH /shifts/{id}/check-in`, `PATCH /shifts/{id}/check-out`, `GET /shifts/{id}/suggest-substitutes` |
| Workers | `GET /workers`, `POST /workers/{id}/sick-leave` |
| Clients | `GET /clients`, `GET /clients/{id}/budget-status?month=`, `GET /clients/budget-alerts?month=` |
| Billing | `GET /exports/billing?month=` (SGB XI CSV) |
| Audit | `GET /audit-logs` (Admin, read-only) |

---

## License & Disclaimer

This project is for **portfolio and educational** use. Use in production requires proper legal, data-protection, and insurance advice. See [GDPR_COMPLIANCE.md](./GDPR_COMPLIANCE.md) for a short compliance statement.
#   H a u s h e l d _ A p p  
 