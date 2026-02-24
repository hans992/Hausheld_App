# Supabase setup (Hausheld)

Supabase’s **direct** connection (`db.PROJECT_REF.supabase.co`) is **not IPv4-compatible** in many setups. Use the **Session pooler** for IPv4. Put the URL only in `backend/.env`; never commit the password.

---

## 1. Session pooler (IPv4-compatible, recommended)

Use the **Session** pooler: port **5432**, user **`postgres.PROJECT_REF`**. This works over IPv4.

In `backend/.env`:

```env
# Session pooler — IPv4 compatible. Port 5432, user postgres.PROJECT_REF
DATABASE_URL=postgresql+asyncpg://postgres.PROJECT_REF:YOUR_DB_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

Replace:

- **`PROJECT_REF`** — from your Supabase project URL, e.g. `faqczjfbxaeaeieixegqd`.
- **`YOUR_DB_PASSWORD`** — database password from **Settings → Database** (not the anon key).

Important:

- Host: **`aws-0-eu-central-1.pooler.supabase.com`**
- Port: **5432** (Session mode; IPv4-compatible)
- User: **`postgres.PROJECT_REF`** (with the dot)

Example (fake password):

```env
DATABASE_URL=postgresql+asyncpg://postgres.faqczjfbxaeaeieixegqd:HausheldDB2026@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

If your password contains special characters (`@`, `#`, `%`, etc.), **URL-encode** it in the connection string (e.g. `@` → `%40`).

---

## 2. Transaction pooler (port 6543) — not IPv4

The **Transaction** pooler uses port **6543** and does **not** support IPv4. Use it only if you’re on an IPv6-capable network. For IPv4, stick with the Session pooler (port 5432) above.

---

## 3. Direct connection — not IPv4

The **direct** connection (`db.PROJECT_REF.supabase.co:5432`) is often IPv6-only and not IPv4-compatible. Prefer the Session pooler for IPv4.

---

## 4. Enable PostGIS

In Supabase: **SQL Editor** → New query → run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

## 5. Run migrations

From `backend/`:

```powershell
python -c "import alembic.config; alembic.config.main(argv=['upgrade', 'head'])"
```

You should see **`Running upgrade 001 -> ...`**, **`Running upgrade 002 -> ...`**, etc. If you see only `Context impl PostgresqlImpl` and `Will assume transactional DDL` with **no** `Running upgrade` lines, the DB is marked as up-to-date but the tables were never created.

### If tables don’t exist (e.g. "relation workers does not exist")

Reset Alembic’s version table so it runs all migrations again:

1. **Supabase → SQL Editor** → run:
   ```sql
   DROP TABLE IF EXISTS alembic_version;
   ```
2. From `backend/` run again:
   ```powershell
   python -c "import alembic.config; alembic.config.main(argv=['upgrade', 'head'])"
   ```
   You should now see `Running upgrade 001 -> 002`, `Running upgrade 002 -> 003`, … and the tables (`workers`, `clients`, `shifts`, etc.) will be created.

---

## 6. Seed demo data

```powershell
python -m app.utils.seed_demo
```

---

## Checklist (IPv4)

| Step | Action |
|------|--------|
| 1 | In `.env`: `DATABASE_URL=postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres` (Session pooler, port **5432**) |
| 2 | Supabase SQL Editor: `CREATE EXTENSION IF NOT EXISTS postgis;` |
| 3 | `alembic upgrade head` (or the `python -c "import alembic.config; ..."` command) |
| 4 | `python -m app.utils.seed_demo` |

If you still get **"Tenant or user not found"**: check project ref in the user (`postgres.xxx`), database password (Settings → Database), and URL-encode the password if it has special characters.
