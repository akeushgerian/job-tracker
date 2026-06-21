## ADDED Requirements

### Requirement: Batch LLM scoring against user profile
After fetching job results from Adzuna, the system SHALL make a single LLM call (via the active provider in AI settings) to score all results against the authenticated user's profile in one batch, returning a match score and fit note for each result.

#### Scenario: Profile exists — scoring succeeds
- **WHEN** the user has a saved profile and the LLM returns valid scores
- **THEN** each job result in the response SHALL include: `score` (integer 0–100), `fitNote` (one sentence explaining the match), and `gaps` (array of up to 3 missing skills or mismatches)

#### Scenario: Profile missing — scoring skipped
- **WHEN** the user has no saved profile
- **THEN** job results SHALL be returned without scores; each result SHALL have `score: null` and `fitNote: null`; the response SHALL include a `scoringSkipped` flag with reason `"no_profile"`

#### Scenario: LLM unavailable — scoring skipped gracefully
- **WHEN** the LLM call fails (Ollama unreachable, Claude API error, timeout)
- **THEN** the system SHALL log the error and return job results without scores rather than failing the entire search request; `scoringSkipped` SHALL be `true` with reason `"llm_error"`

#### Scenario: Results sorted by score descending
- **WHEN** scores are successfully returned
- **THEN** the results array SHALL be sorted highest-score-first before being sent to the client

### Requirement: Profile context for scoring
The system SHALL include the user's profile summary, tech stack, role preferences, and what they explicitly do NOT want (e.g., agency roles) as context in the LLM scoring prompt.

#### Scenario: Scoring uses anti-preferences
- **WHEN** a job result is from an agency (e.g., title contains "Agentur" or description indicates client project work)
- **THEN** the score SHALL reflect the mismatch with the user's stated preference for product companies

### Requirement: On-demand full-text re-score
The system SHALL expose a separate endpoint `POST /api/job-scout/fetch-and-score` that accepts a single job URL, fetches its full text via `lib/job-fetch.ts`, and returns an updated score and fit note based on the complete posting.

#### Scenario: Full-text fetch improves score accuracy
- **WHEN** the user requests a full fetch for a specific job URL
- **THEN** the system SHALL fetch the page text (respecting the SSRF guard), run a single-item LLM scoring call, and return the updated `score`, `fitNote`, and `gaps`

#### Scenario: SSRF-blocked URL
- **WHEN** the job URL resolves to a private or loopback address
- **THEN** the endpoint SHALL return HTTP 422 with the existing `JobFetchError` message
