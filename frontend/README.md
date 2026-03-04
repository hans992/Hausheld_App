# Hausheld – Worker PWA (Mobile Frontend)

Next.js Progressive Web App for field workers: **Schedule**, **Clients**, **Profile**. Mobile-first layout with bottom navigation and large touch targets (Shadcn/UI style).

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** + **TypeScript**
- **Lucide React** (icons)
- **next-pwa** (PWA: service worker, offline-ready)
- **Shadcn-style UI** (Button, Card – large tap targets)

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_URL to your FastAPI backend (e.g. http://localhost:8000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Default route: redirect to **/schedule** when logged in, else **/login**.

## Auth

The app expects a JWT in `localStorage` under the key `hausheld_token`. Login is at **/login** (Demo Login: Admin or Worker); the backend `POST /auth/dev-login` returns a token. When not logged in, Profile links to `/login`. You can also obtain a token manually:

1. Use the backend dev-login: `POST http://localhost:8000/auth/dev-login` with body `{"email": "worker@example.com"}`.
2. Copy the `access_token` from the response.
3. In the browser console on the PWA: `localStorage.setItem('hausheld_token', '<access_token>')`, then refresh.

## Pages

| Route     | Description |
|----------|-------------|
| `/schedule` | **My Schedule** – fetches worker's shifts for **today** from the FastAPI backend (`GET /shifts` filtered by date). Shows cards with time, client id, status, tasks. Check-in (with GPS) and Check-out (with client signature) call the backend; shift detail shows full flow. |
| `/clients`  | **Clients** – placeholder; will list clients from assigned shifts. |
| `/profile`  | **Profile** – placeholder; will show worker profile and login. |

## PWA

- **next-pwa** is disabled in development (`disable: process.env.NODE_ENV === "development"`). Run `npm run build && npm start` to test the service worker.
- Add `public/icon-192.png` and `public/icon-512.png` for install icons (or use the default Next favicon).
- Manifest: `app/manifest.ts` (name, short_name, theme_color, icons).

## Env

| Variable               | Description |
|------------------------|-------------|
| `NEXT_PUBLIC_API_URL`  | FastAPI base URL (e.g. `http://localhost:8000`). |
