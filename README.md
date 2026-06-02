# Laufbahn

A personal job-application tracker and portfolio piece demonstrating a clean,
layered Node.js + TypeScript backend with a modern React frontend.

> **Laufbahn** (German: "career path") — track every application from discovered to
> offer, with a local, agentic LLM assistant that never sends your data to the cloud.

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

## Running the project

Postgres **always** runs in Docker. There are two ways to run the app — pick one,
don't mix them (both want port 3000). All commands use the root `Makefile`
(`make help` lists everything).

### 🅰 Demo mode — everything in Docker (recruiter-ready)

```bash
cp .env.example .env     # first time only; adjust secrets for non-local use
make demo                # build images + start all + load demo data
```

- Frontend → http://localhost:5173 · API → http://localhost:3000
- Demo login: **recruiter@laufbahn.app** / **laufbahn-demo**

```bash
make down                # stop everything (database is kept)
make up                  # start again
make seed                # reload demo data anytime (idempotent)
make rebuild             # rebuild images after pulling new code
```

### 🅱 Dev mode — DB in Docker, app local with hot reload

```bash
pnpm install             # first time only — installs both workspaces
make dev-db              # start the databases + run migrations
make dev-api             # terminal 1 — API with hot reload (:3000)
make dev-web             # terminal 2 — frontend with hot reload (:5173)
make seed                # optional: load demo data
```

> Dev mode reads `backend/.env`, which is pre-pointed at the Dockerized dev DB
> (`localhost:5432`). Don't run `make up` (the Docker API) at the same time.

### Tests

```bash
make test                # backend integration tests vs the throwaway test DB
```

The **test database** (`postgres_test`, port 5433) is memory-backed and used *only*
by `make test`. It is wiped on restart and is never your real data — ignore it for
normal use.

### Reset / wipe

```bash
make reset               # destroy the DB volume, start fresh + migrate
make clean               # stop everything and delete the DB volume
```

## Repository layout

```
backend/    Fastify API — config, db (schema/migrations), modules/, middleware, lib
frontend/   React app — routes/, features/, components/ui, lib
docker-compose.yml
```
