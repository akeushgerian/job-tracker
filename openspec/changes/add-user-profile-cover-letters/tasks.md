# Tasks — User Profile & AI Cover Letter Generation

## 1. Database schema & migration
- [x] 1.1 Add `userProfiles`, `coverLetterReferences`, and `coverLetters` tables to `backend/src/db/schema.ts` (reuse `remoteTypeEnum`; `jsonb` for `skills`/`links`; `coverLetters.applicationId` nullable with `onDelete: 'set null'`; unique index on `userProfiles.userId`; per-table `userId`/`applicationId` indexes). Export inferred row types.
- [x] 1.2 Run `pnpm db:generate` to emit the migration SQL under `backend/src/db/migrations/`; review and commit it.
- [x] 1.3 Run `pnpm db:migrate` locally and confirm the tables exist.

## 2. Backend — profile module (`backend/src/modules/profile/`)
- [x] 2.1 `profile.schemas.ts`: Zod schemas for the profile DTO, the upsert body (skills as `string[]`, links as validated optional URLs, `remotePref` optional enum), and `null`-able read response.
- [x] 2.2 `profile.repository.ts`: `findByUserId`, `upsert(userId, data)` (insert-or-update on the unique `userId`).
- [x] 2.3 `profile.service.ts`: row→DTO mapping; `get` returns `null` when absent; `save` upserts.
- [x] 2.4 `profile.controller.ts` + `profile.routes.ts`: `GET /api/profile`, `PUT /api/profile`, both behind `authenticate` + `requireUser`.
- [x] 2.5 Register `profileRoutes` in `backend/src/app.ts` (prefix `/api/profile`).
- [x] 2.6 `profile.test.ts`: get-when-empty returns `null`, upsert creates then replaces (no duplicate), owner scoping, invalid link → 400, unauthenticated → 401.

## 3. Backend — job URL fetch helper (`backend/src/lib/job-fetch.ts`)
- [x] 3.1 Implement `fetchJobPosting(url)`: reject non-`http(s)`; resolve host and reject private/loopback/link-local addresses (SSRF guard); `fetch` with ~8s `AbortSignal` timeout and capped body size.
- [x] 3.2 Strip `<script>`/`<style>` and HTML tags to plain text, collapse whitespace, cap length; throw a typed error on failure.
- [x] 3.3 Unit test the guard: private-address URL and bad scheme are refused; HTML→text extraction works on a sample string.

## 4. Backend — cover-letters module (`backend/src/modules/cover-letters/`)
- [x] 4.1 `cover-letters.schemas.ts`: schemas for generate body (`applicationId?`, `jobText?`, `jobUrl?`, `referenceId?`, `referenceText?`, `tone?`), cover-letter DTO, update body (`content`), list query (optional `applicationId`), and reference DTO + create/update bodies.
- [x] 4.2 `cover-letters.repository.ts`: cover-letter CRUD scoped to `userId` (+ optional `applicationId` filter); reference CRUD scoped to `userId`.
- [x] 4.3 `cover-letters.prompt.ts` (or inside service): build the system + user messages from profile, resolved job text, and optional reference/tone; rules — ground strictly in profile/job, match the reference when present else clean default, output the letter body only.
- [x] 4.4 `cover-letters.service.ts#generate`: load profile (error if missing), resolve job text (paste → URL via `fetchJobPosting` → application fields/notes → else 400), resolve reference (inline or owned `referenceId`), call `chatCompletion(messages, [])` from `assistant.llm.js`, persist and return the DTO.
- [x] 4.5 `cover-letters.service.ts`: list/get/update(content)/delete for letters; list/create/update/delete for references — all owner-scoped (404 on miss).
- [x] 4.6 `cover-letters.controller.ts` + `cover-letters.routes.ts`: `POST /api/cover-letters/generate`, `GET /api/cover-letters`, `GET|PATCH|DELETE /api/cover-letters/:id`, and `GET|POST /api/cover-letters/references`, `PATCH|DELETE /api/cover-letters/references/:id`; all behind `authenticate`.
- [x] 4.7 Register `coverLettersRoutes` in `backend/src/app.ts` (prefix `/api`).
- [x] 4.8 `cover-letters.test.ts`: mock `chatCompletion` (per `assistant.test.ts`) — generate-from-paste persists & lists; generate without profile errors; missing job source → 400; LLM error → 502 with nothing persisted; reference owner-scoping; letter owner-scoping (404); deleting a linked application clears the link but keeps the letter.

## 5. Frontend — profile feature
- [x] 5.1 `frontend/src/features/profile/api.ts`: `meProfileQueryOptions`/`useProfile` (`['profile']`) and `useSaveProfile` mutation (invalidates `['profile']`).
- [x] 5.2 `frontend/src/features/profile/profile-form.tsx`: react-hook-form + Zod form for all fields (skills as add/remove chips, links group, markdown summary textarea) with save + success state.
- [x] 5.3 `frontend/src/routes/_authed/profile.tsx`: profile page rendering the form.
- [x] 5.4 Add a "Profile" nav item (User icon) to `frontend/src/components/app-shell.tsx`.

## 6. Frontend — cover-letters feature
- [x] 6.1 `frontend/src/features/cover-letters/api.ts`: hooks for generate, list (`['cover-letters']`, optional `applicationId`), get, update, delete, and references CRUD.
- [x] 6.2 `cover-letter-dialog.tsx`: job input with paste/URL toggle, reference picker (saved references + inline option), tone field, Generate button (spinner + `LLM_UNAVAILABLE` handling), editable result textarea, Save + Copy.
- [x] 6.3 `cover-letters-list.tsx`: list saved letters with open/edit/delete; surface application link when present.
- [x] 6.4 Entry points: "Write cover letter" action on `application-card.tsx`/application detail (pre-fills `applicationId` + job fields) and a standalone "Apply to a job" button (applications page or shell) opening the dialog with empty job input.
- [x] 6.5 Optional references manager UI on the Profile page (create/list/delete reusable samples).

## 7. Verification
- [x] 7.1 `pnpm --filter backend test` and `pnpm --filter frontend typecheck` pass.
- [ ] 7.2 Manual: set a profile, generate a letter from a pasted posting and from an application card, save/edit/delete a letter, add and reuse a format reference, confirm owner isolation with a second account. (Not yet done — requires rebuilding the running Docker images, which still run the pre-change code.)
- [x] 7.3 Update `README.md` / `.env.example` if any new env or workflow notes are needed (reuses existing `LLM_*`; no new required env expected).
