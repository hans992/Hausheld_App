# Hausheld Admin

Desktop admin dashboard for Hausheld: calendar, workers, clients, and billing.

## Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** for styling
- **Shadcn-style** UI components (Button, Card, Table)
- **FullCalendar** for the master calendar
- **React Router** for routing
- **Sonner** for toasts

## Setup

```bash
cd admin
npm install
cp .env.example .env.local
# Edit .env.local: set VITE_API_URL to your backend (e.g. http://localhost:8000)
npm run dev
```

Open [http://localhost:5174](http://localhost:5174). Default route is `/admin`.

## Proxy (optional)

If you prefer not to set `VITE_API_URL`, configure Vite to proxy `/api` to your backend (see `vite.config.ts`). Then leave `VITE_API_URL` unset so the app uses `/api` as base.

## Auth

The app uses the same backend as the mobile app. You must be logged in as an **Admin** user. Store the JWT in `localStorage` under the key `hausheld_token` (e.g. via a login page or dev token). The API client sends `Authorization: Bearer <token>` on every request.

## Routes

- **Dashboard** (`/admin`) – Quick links to Calendar, Workers, Clients, Billing
- **Calendar** (`/admin/calendar`) – FullCalendar view of all shifts (from `GET /shifts`)
- **Workers** (`/admin/workers`) – Table of workers; **Sick Leave** button opens a dialog and calls `POST /workers/{id}/sick-leave` with `start_date` and `end_date`
- **Clients** (`/admin/clients`) – Table of clients with Monthly Budget and **red badge** when `budget_alert` is true (remaining &lt; 15% of monthly Entlastungsbetrag), using `GET /clients` and `GET /clients/{id}/budget-status?month=YYYY-MM`
- **Billing** (`/admin/billing`) – Placeholder for billing overview

## Backend endpoints used

- `GET /shifts` – All shifts (admin)
- `GET /workers` – All workers
- `POST /workers/{id}/sick-leave` – Body: `{ start_date, end_date }` (YYYY-MM-DD)
- `GET /clients` – All clients
- `GET /clients/{id}/budget-status?month=YYYY-MM` – Budget status including `budget_alert`
