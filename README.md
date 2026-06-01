# Job Application Tracker

A personal job-application tracker and portfolio piece demonstrating a clean,
layered Node.js + TypeScript backend with a modern React frontend.

- **Backend:** Node 22, Fastify 5, TypeScript (strict), PostgreSQL 17 via Drizzle ORM,
  Zod validation + serialization, JWT auth (access + refresh) in httpOnly cookies,
  Vitest integration tests against a real Postgres.
- **Frontend:** React 19, Vite, TanStack Router (file-based) + Query, Jotai,
  React Hook Form + Zod, Tailwind CSS v4, shadcn-style UI.
- **Architecture:** `routes → controllers → services → repositories → database`.
  All data is scoped per authenticated user.

See [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md)
for details.

## Features

- Email/password auth (register, login, logout, refresh) with per-user data isolation.
- Applications CRUD with a validated status pipeline (no stage skipping), pagination,
  filtering, search, and sorting.
- Interviews, contacts, and follow-ups per application.
- An activity timeline that auto-records status changes, scheduled interviews, and
  follow-ups, plus manual notes/emails.
- A Kanban pipeline board with drag-to-transition.
- A dashboard: totals, response rate, average time-to-response, upcoming interviews,
  and overdue follow-ups.

## Quick start (Docker)

```bash
cp .env.example .env          # adjust secrets for anything non-local
docker compose up -d          # postgres + api (migrates on boot) + frontend
# frontend → http://localhost:5173   api → http://localhost:3000
```

## Local development

```bash
pnpm install                                  # install both workspaces

# database (Docker)
docker compose up -d postgres postgres_test   # app DB on 5432, test DB on 5433

# backend
cd backend && pnpm db:migrate && pnpm dev      # http://localhost:3000

# frontend (separate terminal)
cd frontend && pnpm dev                         # http://localhost:5173 (proxies /api)
```

## Tests

Backend integration tests run against the real test Postgres (no mocks):

```bash
docker compose up -d postgres_test
cd backend && pnpm test
```

## Repository layout

```
backend/    Fastify API — config, db (schema/migrations), modules/, middleware, lib
frontend/   React app — routes/, features/, components/ui, lib
docker-compose.yml
```
