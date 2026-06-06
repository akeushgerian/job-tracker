# Laufbahn

A personal job-application tracker and portfolio piece demonstrating a clean,
layered Node.js + TypeScript backend with a modern React frontend.

> **Laufbahn** (German: "career path") — track every application from discovered to
> offer, with a local, agentic LLM assistant that never sends your data to a
> third-party AI provider.

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

Hosting is **hybrid**: the app always runs locally, while your real data lives in a
managed cloud Postgres ([Neon](https://neon.tech)). The demo and test databases stay
in local Docker containers.

There are two ways to run the app — pick one, don't mix them (both want port 3000).
All commands use the root `Taskfile.yml` ([go-task](https://taskfile.dev),
`brew install go-task`; `task --list` shows everything).

### 🅰 Demo mode — everything in Docker (recruiter-ready, self-contained)

```bash
cp .env.example .env     # first time only; adjust secrets for non-local use
task demo                # build images + start all + load demo data
```

- Frontend → http://localhost:5173 · API → http://localhost:3000
- Demo login: **recruiter@laufbahn.app** / **laufbahn-demo**

```bash
task down                # stop everything (demo database is kept)
task up                  # start again
task seed                # reload demo data anytime (idempotent)
task rebuild             # rebuild images after pulling new code
```

### 🅱 Dev mode — app local with hot reload, data in the cloud

One-time setup: create a free [Neon](https://neon.tech) project (Postgres 17), copy
the **direct** (non-pooled) connection string into `DATABASE_URL` in `backend/.env`,
then run migrations.

```bash
pnpm install             # first time only — installs both workspaces
task dev:migrate         # apply migrations to the cloud DB
task dev:api             # terminal 1 — API with hot reload (:3000)
task dev:web             # terminal 2 — frontend with hot reload (:5173)
```

> Dev mode reads `backend/.env`. Working offline? `task dev:local-db` starts a local
> Postgres on :5432 — flip `DATABASE_URL` to the commented-out localhost line.
> `task db:push-to-cloud` copies that local DB up to the cloud one when you're back.
> Don't run `task up` (the Docker API) at the same time as dev mode.

### Tests

```bash
task test                # backend integration tests vs the throwaway test DB
```

The **test database** (`postgres_test`, port 5433) is memory-backed, local-only, and
used *only* by `task test`. It is wiped on restart and is never your real data —
ignore it for normal use.

### Reset / wipe (demo DB only — never touches the cloud DB)

```bash
task reset               # destroy the demo DB volume, start fresh + migrate
task clean               # stop everything and delete the demo DB volume
```

## Repository layout

```
backend/    Fastify API — config, db (schema/migrations), modules/, middleware, lib
frontend/   React app — routes/, features/, components/ui, lib
docker-compose.yml
```
