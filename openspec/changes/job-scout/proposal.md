## Why

Job searching happens outside the app in a separate terminal session, breaking the workflow — found jobs have to be manually re-entered into the pipeline. A native Job Scout feature brings the search loop into the app so discovery, evaluation, and tracking are one continuous flow.

## What Changes

- New **Scout** page in the top nav with a natural-language search input
- Backend queries the **Adzuna Jobs API** with the user's search text, returning structured job listings for Germany
- Each result is **scored by the local LLM** (Ollama or Claude API depending on AI settings) against the user's saved profile — match rating + a short fit note
- Results display as cards with role, company, location, salary range, match score, and fit summary
- **"Add to Pipeline"** on any card creates an application in `Discovered` status with fields pre-filled
- Optionally fetch the full job posting text (via existing `lib/job-fetch.ts` SSRF-guarded fetcher) for richer LLM analysis

## Capabilities

### New Capabilities

- `job-search`: Natural-language job search against Adzuna API — query parsing, API call, result deduplication, and structured response
- `job-scoring`: LLM-powered relevance scoring of job results against the user's profile — match percentage, fit summary, key gaps
- `job-scout-ui`: Scout page with search form, result cards, and add-to-pipeline action

### Modified Capabilities

- `applications`: The `POST /api/applications` endpoint already exists; no spec-level changes — the Scout UI will call it directly with pre-filled data

## Impact

- **New backend module**: `backend/src/modules/job-scout/` (routes, service, schemas)
- **New env var**: `ADZUNA_APP_ID` + `ADZUNA_API_KEY` (free-tier registration at developer.adzuna.com)
- **Reuses**: `backend/src/lib/job-fetch.ts` (SSRF-guarded URL fetcher), `modules/settings` (AI provider + model), `modules/profile` (scoring context), `modules/applications` (add-to-pipeline)
- **New frontend feature**: `frontend/src/features/job-scout/` + route `_authed/scout.tsx`
- **Nav update**: `app-shell.tsx` gets a Scout link
- **No DB migrations needed**: search results are not persisted (stateless); pipeline creation uses the existing applications table
