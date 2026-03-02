## Hausheld KI — UI Surface Inventory (Baseline)

This file is the baseline UI surface inventory used to validate the premium visual overhaul. It lists key screens and repeated UI patterns across the two apps:

- `frontend/` (Worker PWA, Next.js App Router)
- `admin/` (Admin panel, Vite + React Router)

### Worker PWA (Next.js) — key screens

- **Auth**
  - `frontend/app/login/page.tsx` (logo chip, login card, CTAs)
- **Mobile shell**
  - `frontend/app/(mobile)/layout.tsx` (top header + bottom navigation)
- **Schedule**
  - `frontend/app/(mobile)/schedule/page.tsx` (shift list cards, status chips, primary CTA)
  - `frontend/app/(mobile)/schedule/[id]/page.tsx` (detail cards, status chips, finish flow)
- **Profile / Settings**
  - `frontend/app/(mobile)/profile/page.tsx` (cards, outline buttons)
  - `frontend/app/(mobile)/settings/page.tsx` (native select styling)
- **Signature flow**
  - `frontend/components/signature-pad.tsx` (full-screen dialog chrome + action row)

### Admin Panel (Vite) — key screens

- **Shell**
  - `admin/src/layouts/DashboardLayout.tsx` (sidebar nav, active state, header area)
- **Auth**
  - `admin/src/pages/Login.tsx` (logo chip, login card, CTAs)
- **Data-heavy pages**
  - `admin/src/pages/Dashboard.tsx` (KPI cards, charts, tooltips, hard-coded chart colors)
  - `admin/src/pages/Workers.tsx` (table, modal with native date inputs)
  - `admin/src/pages/Clients.tsx` (table, modal, status pill)
  - `admin/src/pages/Audit.tsx` (table-heavy, action badge)
  - `admin/src/pages/Calendar.tsx` (FullCalendar skin + modal)
  - `admin/src/pages/Billing.tsx` (native month input)
  - `admin/src/pages/Settings.tsx` (native select)

### Repeated UI patterns to standardize

- **Surface / container**: cards, sections, modals, sticky headers, bottom nav
- **Navigation**: sidebar (Admin), tab bar (Worker)
- **Typography**: H1/H2 sections + short body copy
- **Data display**: tables, list rows, hover/focus/selected states
- **Forms**: native `input` + `select` focus states and spacing
- **Status chips**: scheduled/in-progress/completed/alerts (needs dark-first styling)
- **Icons**: lucide sizing + stroke uniformity

### Known “non-premium” offenders (to be removed by the overhaul)

- Bright logo chips (`bg-white/95`) on dark surfaces (Worker + Admin login/shell)
- Consumer-feeling gradients on shell (`bg-gradient-to-b` in Admin sidebar)
- Table gridlines/borders (Admin `Table` component)
- Heavy shadows (`shadow-md`, `shadow-lg`) on cards/modals
- `dark:`-dependent status chip styling in Worker schedule pages
