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
│   └── migrations/   Database migrations (wired in a later task)
├── tests/            Root-level integration tests (added in later tasks)
├── .env.example      Environment variable reference – copy to .env
├── .gitignore
├── package.json      Monorepo root (npm workspaces)
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
# Run all tests in every workspace
npm run test

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

## Scope – Task 1 only

This initial setup includes **only** the project foundation. The following features are intentionally out of scope and will be built in subsequent tasks:

- User registration / login / authentication
- Supabase connection and database schema
- Merchant and shop management
- Product, inventory, purchase and sales features
- Expense tracking and reports
- QR catalogues and image uploads
- Real-time updates and production deployment
