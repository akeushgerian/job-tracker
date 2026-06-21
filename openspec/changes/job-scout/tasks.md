## 1. Environment & Config

- [x] 1.1 Add `ADZUNA_APP_ID` and `ADZUNA_API_KEY` to `backend/.env.example` with comments pointing to developer.adzuna.com
- [x] 1.2 Add `adzunaAppId` and `adzunaApiKey` fields to `backend/src/config/index.ts` (read from env, no default)

## 2. Backend — Job Scout Module

- [x] 2.1 Create `backend/src/modules/job-scout/job-scout.schemas.ts` — Zod schemas for `SearchQuery` (input), `JobResult` (Adzuna item + score fields), `SearchResponse` (results array + optional scoringSkipped flag)
- [x] 2.2 Create `backend/src/modules/job-scout/job-scout.service.ts` — `JobScoutService` class with `search(userId, query)` method:
  - Step 1: call LLM to extract `keywords` + `location` from natural-language query
  - Step 2: call Adzuna API with extracted params (20 results, Germany)
  - Step 3: deduplicate by redirect URL
  - Step 4: fetch user profile; if present, batch-score all results in one LLM call
  - Step 5: sort by score descending, return `SearchResponse`
- [x] 2.3 Create `backend/src/modules/job-scout/job-scout.service.ts` — `fetchAndScore(userId, jobUrl)` method: fetch full text via `lib/job-fetch.ts`, single-item LLM score call, return updated score + fitNote + gaps
- [x] 2.4 Create `backend/src/modules/job-scout/job-scout.routes.ts` — register `POST /search` and `POST /fetch-and-score` with auth hook; inject `JobScoutService` with `SettingsService` and `ProfileRepository` dependencies
- [x] 2.5 Register job-scout routes in `backend/src/app.ts` at prefix `/api/job-scout`
- [x] 2.6 Add `JobScoutError` (502 upstream) and `JobScoutUnconfiguredError` (503) to `backend/src/lib/errors.ts`

## 3. LLM Prompt Helpers

- [x] 3.1 In `job-scout.service.ts`, write the query-translation prompt: system context explains the task is to extract job search params; user message is the raw query; expect JSON `{ keywords: string, location: string }`
- [x] 3.2 Write the batch-scoring prompt: system context includes user profile summary + preferences + anti-preferences; user message is a compact JSON array of `{ id, title, company, snippet }`; expect JSON array of `{ id, score, fitNote, gaps }`
- [x] 3.3 Add graceful fallback in both prompt calls — if LLM returns unparseable JSON, log warning and return results without scores (`scoringSkipped: true, reason: "llm_error"`)

## 4. Frontend — Types & API Client

- [x] 4.1 Add `JobResult`, `SearchResponse` types to `frontend/src/lib/types.ts` mirroring the backend schemas
- [x] 4.2 Create `frontend/src/features/job-scout/api.ts` — `useJobSearch` mutation hook (`POST /api/job-scout/search`) and `useFetchAndScore` mutation hook (`POST /api/job-scout/fetch-and-score`)

## 5. Frontend — Scout Page Components

- [x] 5.1 Create `frontend/src/features/job-scout/search-form.tsx` — controlled text input + submit button; validates non-empty; disables + shows spinner while mutation is pending
- [x] 5.2 Create `frontend/src/features/job-scout/job-card.tsx` — card with title, company, location, salary (conditional), posted date (relative), 3-line truncated snippet, score badge (skeleton while scoring pending), fit note, "Add to Pipeline" button, "View full posting" link
- [x] 5.3 Create `frontend/src/features/job-scout/results-list.tsx` — renders list of `JobCard` components; shows empty-state message when results are empty
- [x] 5.4 Create `frontend/src/features/job-scout/no-profile-banner.tsx` — dismissible banner with link to `/profile` shown when `scoringSkipped.reason === "no_profile"`

## 6. Frontend — Scout Route

- [x] 6.1 Create `frontend/src/routes/_authed/scout.tsx` — page component: holds search state + results in local state; renders `SearchForm`, optional `NoProfileBanner`, `ResultsList`; handles error state with "Try again" button
- [x] 6.2 Add "Scout" nav link to `frontend/src/components/app-shell.tsx` (between Dashboard and Applications, or after Applications — match existing nav ordering)

## 7. Add-to-Pipeline Integration

- [x] 7.1 In `job-card.tsx`, wire "Add to Pipeline" button to call `POST /api/applications` with `{ company, role, jobUrl, status: "discovered" }` using the existing `post` helper from `@/lib/api`
- [x] 7.2 On success: show toast, set card's local `added` state to `true`, disable + relabel button to "Added ✓"
- [x] 7.3 Track added job URLs in a `Set` at the `ResultsList` level so re-renders preserve the "Added ✓" state within the session

## 8. Verification

- [x] 8.1 Run `pnpm --filter backend typecheck` — zero errors
- [x] 8.2 Run `pnpm --filter frontend typecheck` — zero errors
- [ ] 8.3 Manual smoke test: search "senior React developer Bielefeld", verify results appear with scores, add one to pipeline, confirm it appears in the Kanban at Discovered
- [ ] 8.4 Manual smoke test: search with no profile saved, verify no-profile banner appears and cards render without score badges
- [ ] 8.5 Manual smoke test: click "View full posting" — opens correct URL in new tab
