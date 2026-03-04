# Hausheld Admin

Desktop admin dashboard for Hausheld: calendar, workers, clients, and billing.

## Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** for styling
- **Shadcn-style** UI components (Button, Card, Table)
- **Custom calendar** (week/day/month + time slots, shadcn-style) for shifts and assign flow
- **React Router** for routing
- **Sonner** for toasts

## Setup

```bash
cd admin
npm install
cp .env.example .env
# Edit .env: set VITE_API_URL to your backend (e.g. http://localhost:8000), optionally VITE_MAPBOX_TOKEN for Map page
npm run dev
```

Open [http://localhost:5174](http://localhost:5174). Default route is `/admin`.

## Proxy (optional)

If you prefer not to set `VITE_API_URL`, configure Vite to proxy `/api` to your backend (see `vite.config.ts`). Then leave `VITE_API_URL` unset so the app uses `/api` as base.

## Auth

The app uses the same backend as the mobile app. You must be logged in as an **Admin** user. Store the JWT in `localStorage` under the key `hausheld_token` (e.g. via a login page or dev token). The API client sends `Authorization: Bearer <token>` on every request.

## Routes

- **Dashboard** (`/admin`) – Stat cards (Workers, Clients, Unassigned, Budget Alerts) linking to relevant pages; summary KPIs and Recharts charts (weekly trends, city distribution, top workers). Sidebar for all navigation.
- **Calendar** (`/admin/calendar`) – Custom week/day/month view of all shifts (`GET /shifts`); click an unassigned shift to open suggested substitutes and assign a worker.
- **Workers** (`/admin/workers`) – Table of workers; **Sick Leave** button opens a dialog and calls `POST /workers/{id}/sick-leave` with `start_date` and `end_date`
- **Clients** (`/admin/clients`) – Table of clients with Monthly Budget and **red badge** when `budget_alert` is true (remaining &lt; 15% of monthly Entlastungsbetrag), using `GET /clients` and `GET /clients/{id}/budget-status?month=YYYY-MM`
- **Map** (`/admin/map`) – Heatmap (shift density by client) and worker pins (Mapbox + Deck.gl); requires `VITE_MAPBOX_TOKEN`.
- **Billing** (`/admin/billing`) – SGB XI CSV export by month (month picker + download).
- **Audit** (`/admin/audit`) – Read-only audit log.
- **Profile** (`/admin/profile`) – Admin profile.
- **Settings** (`/admin/settings`) – App settings.

## Backend endpoints used

- `GET /shifts`, `PATCH /shifts/{id}` – List shifts; assign worker (body: `worker_id`)
- `GET /shifts/{id}/suggest-substitutes` – Suggested substitutes for unassigned shift
- `GET /workers` – All workers
- `POST /workers/{id}/sick-leave` – Body: `{ start_date, end_date }` (YYYY-MM-DD)
- `GET /clients` – All clients
- `GET /clients/{id}/budget-status?month=YYYY-MM` – Budget status including `budget_alert`
- `GET /clients/budget-alerts?month=YYYY-MM` – Clients with budget alert
- `GET /api/v1/stats/dashboard-summary` – KPIs, weekly trends, city distribution, top workers
- `GET /api/v1/geo/heatmap` – GeoJSON for Map heatmap
- `GET /audit-logs` – Audit log (read-only)
- `GET /exports/billing?month=YYYY-MM` – SGB XI CSV download
- Auth: `POST /auth/dev-login`, `GET /auth/me`
