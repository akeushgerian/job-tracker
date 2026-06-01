# Backend — Laufbahn API

Fastify + TypeScript (strict) + Drizzle ORM + PostgreSQL. Layered architecture:
`routes → controllers → services → repositories → database`.

## Layout

```
src/
├── config/        env validation (Zod) → typed config
├── db/            Drizzle schema, client (pool), migrate runner, migrations/
├── lib/           errors, password (bcrypt), jwt, cookies
├── middleware/    error handler, auth guard
├── modules/
│   ├── auth/      register / login / logout / refresh / me  (+ tests)
│   └── health/    health check (DB ping)
├── types/         Fastify request augmentation (request.user)
├── app.ts         buildApp() — plugins, compilers, routes
└── server.ts      listen + graceful shutdown
```

## Conventions

- Every endpoint has a Zod **input** schema and a Zod **output** (response) schema.
- Repositories return typed DTOs, never raw rows leak past the service.
- Domain errors (`ApplicationNotFoundError`, `InvalidStatusTransitionError`, …) carry
  an HTTP status + stable `code`; the global error handler maps them.
- Auth: JWT access + refresh tokens in `httpOnly` cookies.
- All data is scoped per authenticated user.

## Commands

```bash
pnpm dev          # tsx watch
pnpm build        # tsc -> dist/
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest (needs a running test Postgres)
pnpm db:generate  # drizzle-kit generate (after schema changes)
pnpm db:migrate   # apply migrations
```

## Tests

Integration tests run against a **real** Postgres (no mocks). Start the test DB
(exposed on port 5433) and run:

```bash
docker compose up -d postgres_test
pnpm test
```

Override the test DB with `TEST_DATABASE_URL` if needed.
