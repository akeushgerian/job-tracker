# Design — User Profile & AI Cover Letter Generation

## Context

The backend is Fastify + Drizzle (postgres-js) with a strict per-module layering:
`*.routes.ts` (wires DI + Zod schemas) → `*.controller.ts` → `*.service.ts` (business
rules, DTO mapping) → `*.repository.ts` (Drizzle queries). Every authed route uses the
`authenticate` preHandler and `requireUser(request)`; ownership is enforced by scoping
every query to `userId`. The existing `assistant` module talks to a local Ollama model
through `assistant.llm.ts#chatCompletion(messages, tools)` (OpenAI-compatible,
non-streaming) using `config.LLM_*`. The frontend is React 19 + TanStack Router
(file-based, `_authed` layout) + TanStack Query, feature-sliced under `src/features/*`,
with a shared `api` fetch helper and shadcn-style UI primitives.

This change adds two new capabilities that slot into those exact patterns.

## Goals

- A single per-user profile combining typed fields and a freeform markdown block.
- Generate persisted cover letters from profile + job (paste or URL) + optional format
  references; reuse the existing LLM plumbing with **no tool calls** (single round-trip).
- Two creation entry points: from an application (swim lane) and standalone.
- Reusable format references so output matches a chosen sample, free-style otherwise.

## Non-Goals

- Streaming generation, file upload/parse, export formats, email, auth'd scraping.

## Decisions

### 1. Data model (Drizzle, `backend/src/db/schema.ts`)

```text
user_profiles            (one row per user)
  id              uuid pk
  userId          uuid unique notNull → users.id (cascade)
  headline        text
  targetRole      text
  branch          text          -- industry / field, e.g. "Backend / Fintech"
  seniority       text          -- free text: "Senior", "Lead", ...
  location        text
  remotePref      remote_type   -- reuse existing enum (onsite|hybrid|remote), nullable
  skills          jsonb         -- string[], default []
  links           jsonb         -- { linkedin?, github?, portfolio?, website? }, default {}
  summary         text          -- freeform markdown "about me / CV summary"
  createdAt / updatedAt  timestamptz

cover_letter_references  (reusable style samples)
  id              uuid pk
  userId          uuid notNull → users.id (cascade)
  label           text notNull
  content         text notNull  -- the sample letter
  createdAt       timestamptz

cover_letters
  id              uuid pk
  userId          uuid notNull → users.id (cascade)
  applicationId   uuid nullable → applications.id (ON DELETE SET NULL)
  jobTitle        text
  jobCompany      text
  jobUrl          text
  jobText         text notNull  -- the resolved posting text used for generation
  content         text notNull  -- the generated/edited letter
  model           text          -- model id used, for provenance
  createdAt / updatedAt  timestamptz
```

- **One profile per user** → `unique(userId)`; the API is an *upsert* (`PUT`), so the
  client never manages profile ids.
- `cover_letters.applicationId` is **nullable** with `ON DELETE SET NULL`: a letter
  created from a swim-lane card links to its application but survives the application's
  deletion (becomes standalone) — consistent with "save & link, standalone otherwise".
- `skills`/`links` use `jsonb` to avoid extra tables for a single-user-owned doc; they
  are validated by Zod at the edge, mirroring how `applications` validates input.
- Reuse `remoteTypeEnum`; do **not** invent an "any" value — `null` means no preference.

### 2. New migration

Drizzle migrations are generated, not hand-written (`pnpm db:generate` →
`backend/src/db/migrations/000N_*.sql`, applied by `pnpm db:migrate`). This change adds
**one** generated migration covering the three tables. The migration runner
(`migrate.ts`) and Docker entrypoint already apply pending migrations on boot.

### 3. Backend modules

Two modules mirroring `applications`:

- `modules/profile/` — `profile.routes.ts`, `.controller.ts`, `.service.ts`,
  `.repository.ts`, `.schemas.ts`, `.test.ts`. Endpoints under `/api/profile`:
  - `GET /api/profile` → profile DTO or `null` (no 404 for "not set yet").
  - `PUT /api/profile` → upsert, returns DTO.
- `modules/cover-letters/` — same file set, registered under `/api`:
  - `POST /api/cover-letters/generate` → runs the LLM, persists, returns the letter.
  - `GET /api/cover-letters` (list, newest first; optional `applicationId` filter).
  - `GET /api/cover-letters/:id`, `PATCH /api/cover-letters/:id` (edit `content`),
    `DELETE /api/cover-letters/:id`.
  - References: `GET/POST /api/cover-letters/references`,
    `PATCH/DELETE /api/cover-letters/references/:id`.

Both register their plugin in `app.ts` after `assistantRoutes`.

### 4. Generation flow (`cover-letters.service.ts`)

```text
generate(userId, { applicationId?, jobText?, jobUrl?, referenceId?, referenceText?, tone? })
  1. Load profile (404-equivalent ValidationError if none → "set up your profile first").
  2. Resolve job text:
       - if jobText present → use it
       - else if jobUrl present → fetchJobPosting(jobUrl) (best effort)
       - else if applicationId present → derive from application fields + notes
       - else → ValidationError("provide the job posting text or a URL")
  3. Resolve reference text: referenceText, or lookup referenceId (owned), else none.
  4. Build messages: system prompt (role, rules, format guidance) + user prompt
     (profile block, job block, optional reference block, optional tone).
  5. chatCompletion(messages, [])  // no tools → single completion round
  6. Persist cover_letters row (jobTitle/jobCompany derived or echoed), return DTO.
```

- Reuse `assistant.llm.ts#chatCompletion`; it already handles empty `tools` and throws
  `LlmError (502)` when Ollama is unreachable — surfaced to the client unchanged.
- Prompt rules: ground strictly in the profile/job (never invent employers, dates, or
  achievements not present); if a reference is supplied, match its structure, tone, and
  length; otherwise write a clean professional default. Output the letter body only.

### 5. URL fetching (`lib/job-fetch.ts`) — best effort + SSRF guard

- `fetch(url)` with an `AbortSignal` timeout (~8s) and a capped body read.
- Reject non-`http(s)` schemes; resolve the host and **reject private/loopback/
  link-local ranges** (block SSRF) before fetching.
- Strip `<script>/<style>` and tags to plain text, collapse whitespace, cap length.
- Any failure → typed error that the service converts into "couldn't read that URL —
  paste the posting text instead" (HTTP 422), so the UI can fall back to paste.

### 6. Frontend

- `features/profile/`: `api.ts` (`useProfile`, `useSaveProfile`), `profile-form.tsx`;
  route `routes/_authed/profile.tsx`. Add a "Profile" nav item (User icon) in
  `app-shell.tsx`.
- `features/cover-letters/`: `api.ts` (generate/list/get/update/delete + references),
  `cover-letter-dialog.tsx` (job input: paste/URL toggle, reference picker, Generate,
  editable textarea result, Save/Copy), `cover-letters-list.tsx`.
- Entry points: a "Write cover letter" action on the application card/detail
  (pre-fills `applicationId` + job fields) and a standalone "Apply to a job" button
  (e.g. on the applications page / shell) opening the same dialog with empty job input.
- Reuse the `api` helper, TanStack Query keys (`['profile']`, `['cover-letters']`,
  `['cover-letter-references']`), and existing UI primitives (Dialog, Tabs, Textarea,
  Select, Button).

## Risks / Trade-offs

- **LLM latency/availability.** Generation can be slow or fail if Ollama is down; the
  UI shows a spinner and surfaces the existing `LLM_UNAVAILABLE` error. Accepted —
  same trade-off the assistant already makes.
- **URL fetch reliability.** Many postings are JS-rendered or login-walled; fetch is
  explicitly best-effort with a paste fallback, not a scraping guarantee.
- **SSRF.** Mitigated by scheme + private-range checks; documented as the key security
  control to review.
- **jsonb vs relational skills/links.** Chosen for simplicity; if we later need to
  query/filter by skill this would migrate to a join table.

## Migration Plan

1. Extend `schema.ts`; run `pnpm db:generate` to emit the migration; commit it.
2. Ship backend modules + `lib/job-fetch.ts`; register routes in `app.ts`.
3. Ship frontend features, route, nav, and entry points.
4. `pnpm db:migrate` runs automatically on deploy (entrypoint) and locally.
- Purely additive; no backfill or rollback of existing data required.

## Open Questions

- Should generation auto-create a draft application when launched standalone, or stay
  unlinked until the user adds one? (Default: stay unlinked; `applicationId` optional.)
- Cap on number of saved references / letters per user? (Default: none initially.)
