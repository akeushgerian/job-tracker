## Context

Currently, job discovery happens outside the app — the user opens a separate terminal session with a Claude Code context directory (`D:/Development/job-search`) and manually searches for positions. Found jobs are then re-entered into the pipeline by hand. This breaks the workflow and creates friction between discovery and tracking.

The app already has all the building blocks: a profile module (user identity + preferences), an AI settings module (Ollama / Claude toggle), an SSRF-guarded URL fetcher (`lib/job-fetch.ts`), and the applications pipeline. The missing piece is a search layer that pulls job listings from a real source and routes them through those existing components.

## Goals / Non-Goals

**Goals:**
- Natural-language job search from within the app UI
- Structured job results scored against the user's profile using the active AI provider
- One-click pipeline addition from any result card
- No new DB tables or migrations required

**Non-Goals:**
- Saved searches or search history
- Real-time alerts / push notifications for new listings
- LinkedIn, Stepstone, or Indeed scraping (fragile, ToS risk)
- Pagination of raw API results beyond the first response
- Job posting full-text fetch for every result (too slow; optional per-card only)

## Decisions

### 1. Adzuna Jobs API for search

**Decision**: Use Adzuna (`api.adzuna.com/v1/api/jobs/de/search`) as the job data source.

**Rationale**: Free tier (1 000 calls/month), covers Germany, returns structured data (title, company, location, salary min/max, description snippet, redirect URL, posted date). No scraping, no ToS risk. Requires two env vars: `ADZUNA_APP_ID` + `ADZUNA_API_KEY`.

**Alternatives considered**:
- SerpAPI / Brave Search: Generic web search, noisier results, paid.
- Jooble: Free but lower data quality for German market.
- RSS feeds (Stepstone, Indeed): Free but very limited fields, no structured salary data.

### 2. Query translation via LLM before Adzuna call

**Decision**: Pass the user's natural-language query through the active LLM first to extract structured search parameters (`keywords`, `location`, `distance_km`) before calling Adzuna.

**Rationale**: Adzuna's `what` and `where` params are keyword-based. "Find senior frontend roles near Bielefeld" needs to be parsed to `what=senior frontend developer&where=bielefeld&distance=40`. This keeps the UX natural without brittle regex parsing.

**Alternatives considered**:
- Parse client-side in JavaScript: brittle, not reusable.
- Let users fill a structured form: works but kills the terminal-like UX the user wants.

### 3. AI scoring is a second LLM call per batch, not per card

**Decision**: After Adzuna returns results, make a single LLM call with all listings (title + company + snippet) and the user's profile summary. Ask it to return a JSON array of `{ id, score, fitNote, gaps }` in one shot.

**Rationale**: One call per card (N calls) would be too slow and burn Ollama capacity. A single batched call with a compact representation of all results is fast and cheap.

**Alternatives considered**:
- Score only on click: Lazy but means the list looks unsorted and undifferentiated until user interacts.
- Pre-sort by keyword match without LLM: Fast but ignores the nuanced profile preferences (agency vs product, architecture ownership, etc.).

### 4. Stateless — results not persisted

**Decision**: Search results are returned directly from `POST /api/job-scout/search` and never written to the DB. Only when "Add to Pipeline" is clicked does anything get persisted (via the existing `POST /api/applications` endpoint).

**Rationale**: Search results are ephemeral and user-specific. Persisting them adds schema complexity for zero user benefit — they can re-search instantly.

### 5. Reuse `chatCompletion` from `assistant.llm.ts`

**Decision**: Both the query-translation call and the scoring call go through the existing `chatCompletion` function in `modules/assistant/assistant.llm.ts`, which already handles the Ollama / Claude API routing based on the user's AI settings.

**Rationale**: No duplicated LLM wiring. The settings module already manages provider selection and API key decryption.

## Risks / Trade-offs

- **Adzuna rate limit (1 000 calls/month)** → Each search is 1 call. At casual usage (a few searches/day) this is fine. Add the limit note to the UI tooltip. Mitigation: cache the last result set in server memory for 60 s to absorb rapid re-searches.
- **LLM scoring latency** → Ollama on consumer hardware may take 3–8 s for a batched scoring call. Mitigation: stream back Adzuna results immediately, show a scoring spinner per card that resolves as the LLM responds.
- **Adzuna description snippets are short** → The LLM scores from 200-char snippets, not full postings. Mitigation: "View full posting" fetches via `job-fetch.ts` on demand; scoring updates after fetch.
- **Query translation adds one LLM round-trip** → ~1–2 s on Ollama before the Adzuna call even fires. Mitigation: Acceptable for a search that already takes seconds; show a spinner immediately on submit.

## Migration Plan

1. Register `ADZUNA_APP_ID` and `ADZUNA_API_KEY` in `backend/.env` and `.env.example`.
2. Deploy the new `job-scout` module (no DB changes).
3. Add the Scout nav link.
4. No rollback complexity — the module is purely additive.

## Open Questions

- Should the Adzuna `distance` default be 40 km (commutable from Bielefeld) or 0 (city only)? Default to 40 km with a future UI slider.
- Should `results_per_page` be fixed at 20 or configurable? Fix at 20 for now.
