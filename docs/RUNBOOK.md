# Hausheld runbook

Short operations guide: required env, health checks, logs, seed, and basic troubleshooting.

---

## Required environment variables

| Component | Variable | Description |
|-----------|----------|-------------|
| **Backend** | `DATABASE_URL` | PostgreSQL connection string (async driver: `postgresql+asyncpg://user:pass@host:5432/dbname`). |
| | `JWT_SECRET` | Secret for signing JWTs; change in production. |
| | `AUTH_DEV_MODE` | `true` for demo login (no external IdP). |
| | `ALLOWED_ORIGINS` | CORS origins, comma-separated or `*`. |
| **Frontend (PWA)** | `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g. `http://localhost:8000`). Copy from `frontend/.env.example` to `.env.local`. |
| **Admin** | `VITE_API_URL` | Backend API base URL. |
| | `VITE_MAPBOX_TOKEN` | Optional; required for Map page (Mapbox base map). |

See `backend/.env.example`, `frontend/.env.example`, and `admin/.env.example` for full lists.

---

## Health and readiness

- **Health (liveness):** `GET /health` — static check; returns `{"status":"ok"}`. Use for load balancers and simple “is the process up?” checks.
- **Readiness:** `GET /ready` — checks database connectivity (`SELECT 1`). Returns `200` when the DB is reachable, `503` with `{"error":{"code":"not_ready","message":"Database unavailable"}}` when not.

Example:

```bash
curl -s http://localhost:8000/health
curl -s http://localhost:8000/ready
```

In Kubernetes or similar, use `/health` for liveness and `/ready` for readiness so the pod is not sent traffic until the DB is available.

---

## Logs

- **Backend:** Request/error logging is done via Python `logging` in the FastAPI app. Each request is logged with method, path, status, and duration; 4xx are logged at warning, 5xx at error. Unhandled exceptions are logged with traceback. Log output goes to the process stdout/stderr (e.g. where you run `uvicorn`). In production, capture stdout/stderr with your normal logging pipeline (e.g. container logs, CloudWatch, Datadog).
- **Frontend / Admin:** No server-side request logging in the runbook scope; use browser DevTools and network tab for API errors.

---

## Running the demo seed

Creates demo workers (including `admin@demo.com`), clients with geo data, and shifts so the dashboard and map have data.

```bash
cd backend
# Ensure DB is up and migrations applied
alembic upgrade head
python -m app.utils.seed_demo
```

After seeding, use **Demo Login** in the mobile app or admin with the seeded emails (e.g. Admin, Worker). The Admin dashboard also has a “Load demo data” action that can seed via the API.

---

## Basic troubleshooting

| Symptom | What to check |
|--------|----------------|
| **Map empty (no heatmap, no worker pins)** | Run the demo seed so clients have `address_location` and workers have `current_location`. Ensure `GET /api/v1/geo/heatmap` and `GET /workers` return data when called with a valid JWT. |
| **`/ready` returns 503** | Database is down or unreachable. Check `DATABASE_URL`, that Postgres (and PostGIS extension) is running, and that the network allows connections. |
| **401 on API calls** | No or invalid JWT. In dev, use Demo Login to get a token; ensure `AUTH_DEV_MODE=true` and seed has been run. |
| **422 validation errors** | Request body or query params don’t match the API schema. Check the response `error.details` for field-level errors. |
| **Frontend/Admin “can’t reach API”** | Set `NEXT_PUBLIC_API_URL` (frontend) and `VITE_API_URL` (admin) to the backend base URL (e.g. `http://localhost:8000`). For production, use the real API URL and ensure CORS `ALLOWED_ORIGINS` includes the frontend origin. |

---

## Running tests

**Backend (pytest)** — Requires a running PostgreSQL with PostGIS and tables created (e.g. via app lifespan or `alembic upgrade head`).

```bash
cd backend
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/hausheld
export AUTH_DEV_MODE=true
python -m pytest tests/ -v
```

CI runs these tests in GitHub Actions with a PostGIS service container; see `.github/workflows/ci.yml`.
