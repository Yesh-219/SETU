# Setu – Multi-Merchant Shop Management Platform

Setu is a production-minded, multi-merchant shop management platform built with React, Vite, TypeScript, Tailwind CSS (frontend) and Node.js + Express + TypeScript (backend).

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 20.x or later |
| npm | 10.x or later |

---

## Repository layout

```
setu/
├── apps/
│   ├── web/          React + Vite + TypeScript frontend
│   └── api/          Express + TypeScript backend
├── packages/
│   └── shared/       Cross-cutting TypeScript types and utilities
├── supabase/
│   └── migrations/   Versioned SQL migrations (apply manually or via psql)
├── tests/            Root-level tests (migration validators, future integration tests)
├── .env.example      Environment variable reference – copy to .env
├── .gitignore
├── package.json      Monorepo root (npm workspaces)
├── vitest.config.ts  Root-level Vitest config (tests/ directory)
└── README.md
```

---

## Installation

```bash
# From the repository root – installs all workspace dependencies
npm install
```

---

## Development

### Run both frontend and backend concurrently

```bash
npm run dev
```

### Run the frontend only

```bash
npm run dev:web   # http://localhost:5173
```

### Run the backend only

```bash
npm run dev:api   # http://localhost:4000
```

> **Note:** The Vite dev server proxies `/api/*` requests to the backend, so both can be used together without CORS issues.

---

## Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Used by | Notes |
|----------|---------|-------|
| `PORT` | API | Default: `4000` |
| `NODE_ENV` | API | `development` \| `production` \| `test` |
| `SUPABASE_URL` | API | Added in a later task |
| `SUPABASE_ANON_KEY` | API | Added in a later task |
| `SUPABASE_SERVICE_ROLE_KEY` | API (backend only) | **Never** expose to the frontend |
| `DATABASE_URL` | API (backend only) | Postgres connection string — backend only, never expose |
| `VITE_SUPABASE_URL` | Web | Added in a later task |
| `VITE_SUPABASE_ANON_KEY` | Web | Added in a later task |

---

## Build

```bash
# Build all workspaces
npm run build

# Build individually
npm run build:api
npm run build:web
```

---

## Testing

```bash
# Run all tests (root migration tests + all workspace tests)
npm run test

# Run only the root-level migration static validator
npm run test:root

# Run only workspace tests
npm run test:workspaces

# Run just the frontend tests
npm run test --workspace=apps/web

# Run just the API tests
npm run test --workspace=apps/api
```

---

## API reference

### `GET /api/v1/health`

Returns the API process health. Does **not** require a database connection.

**Response `200 OK`**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "version": "0.1.0"
  }
}
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `EADDRINUSE: address already in use :4000` | Another process is using port 4000. Change `PORT` in `.env` or stop the other process. |
| `Cannot find module '@setu/shared'` | Run `npm install` from the repository root to link workspace packages. |
| Tailwind classes not applying | Ensure `postcss.config.js` and `tailwind.config.js` are present in `apps/web`. |
| `tsx` not found | Run `npm install` – `tsx` is a dev dependency of `apps/api`. |
| Migration fails with "extension already exists" | Add `IF NOT EXISTS` — already included in all migrations. |
| Migration fails with "relation already exists" | Each `CREATE TABLE` uses `IF NOT EXISTS`; safe to re-run on the same DB. |

---

## Database migrations

Migrations live in `supabase/migrations/` and are numbered sequentially:

```
supabase/migrations/
└── 0001_core_identity_and_tenancy.sql   ← users, user_sessions, shops, shop_members, shop_settings
```

### Applying migrations manually

No Supabase CLI or migration runner is required for Task 2. Apply via:

**Option A — Supabase Dashboard SQL editor**
1. Open your Supabase project → SQL Editor.
2. Paste the contents of the migration file.
3. Click **Run**.

**Option B — psql**
```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_core_identity_and_tenancy.sql
```

**Option C — Supabase CLI** (if installed later)
```bash
supabase db push
```

### Migration philosophy
- Files are named `NNNN_description.sql` (four-digit prefix, underscored description).
- Every statement uses `IF NOT EXISTS` / `CREATE OR REPLACE` so migrations are safe to re-run.
- Never drop tables or columns in a migration without first consulting the team.
- Always apply migrations in order on a fresh database.
- Never run migrations against production without a backup and a review.

### Row-Level Security and backend access

All five tables have **RLS enabled**. No RLS policies are defined. This means:

- The **Supabase Data API (PostgREST)** cannot return any rows to anonymous or Supabase JWT callers — the tables are effectively invisible to the public internet.
- The **Express backend** connects using the **service-role key** (via `DATABASE_URL` or the Supabase client initialized with `SUPABASE_SERVICE_ROLE_KEY`). The service role bypasses RLS intentionally and is the only path for legitimate data access.
- `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **server-only** variables. They must never appear in `VITE_*` environment variables or be sent to the browser.
- Do not add RLS policies that reference `auth.uid()` — Supabase Auth is not used in Setu.

---

## Design tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary teal | `#0F766E` | Brand colour, CTAs |
| Light teal | `#CCFBF1` | Tinted backgrounds |
| Background | `#F8FAFC` | Page background |
| Card | `#FFFFFF` | Card surfaces |
| Main text | `#0F172A` | Body copy |
| Muted text | `#64748B` | Labels, placeholders |
| Border | `#E2E8F0` | Dividers, outlines |

---

## Scope

### Task 1 — Project foundation ✅
- React/Vite/TypeScript frontend with Tailwind CSS
- Express/TypeScript backend with health endpoint
- npm workspaces, shared types, automated tests

### Task 2 — Database schema ✅
- PostgreSQL migration: `users`, `user_sessions`, `shops`, `shop_members`, `shop_settings`
- RLS enabled on all tables; no public access
- Static SQL validator tests (30+ assertions)

### Upcoming tasks (not yet implemented)
- User registration / login / authentication
- Supabase connection pool and database client
- Shop onboarding UI and API
- Product, inventory, purchase and sales features
- Expense tracking and reports
- QR catalogues and image uploads
- Real-time updates and production deployment
