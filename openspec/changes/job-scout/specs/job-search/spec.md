## ADDED Requirements

### Requirement: Natural-language job search
The system SHALL accept a natural-language search query from the authenticated user, translate it to Adzuna API parameters via the active LLM, call the Adzuna Jobs API for Germany, and return a list of structured job results.

#### Scenario: Successful search
- **WHEN** an authenticated user submits a query such as "find senior frontend jobs near Bielefeld"
- **THEN** the system returns up to 20 job results each containing: title, company, location, salary range (if available), description snippet, redirect URL, and posted date

#### Scenario: LLM extracts location and keywords
- **WHEN** the query mentions a city or region
- **THEN** the LLM SHALL extract `keywords` and `location` fields and the Adzuna call SHALL use `where=<location>&distance=40`

#### Scenario: No results from Adzuna
- **WHEN** Adzuna returns zero results for the translated query
- **THEN** the API SHALL return an empty results array with HTTP 200 and a `message` field suggesting the user broaden their search

#### Scenario: Adzuna credentials missing
- **WHEN** `ADZUNA_APP_ID` or `ADZUNA_API_KEY` env vars are not set
- **THEN** the endpoint SHALL return HTTP 503 with a clear error message indicating the feature requires API credentials

#### Scenario: Adzuna API error
- **WHEN** the Adzuna API responds with a non-2xx status
- **THEN** the endpoint SHALL return HTTP 502 and log the upstream status code

### Requirement: Authenticated-only access
The `/api/job-scout/search` endpoint SHALL be protected by the existing JWT auth middleware and reject unauthenticated requests with HTTP 401.

#### Scenario: Unauthenticated request
- **WHEN** a request is made without a valid auth cookie
- **THEN** the system SHALL return HTTP 401

### Requirement: Result deduplication
The system SHALL deduplicate Adzuna results by redirect URL before returning them, discarding any duplicate postings from the same listing appearing under different Adzuna IDs.

#### Scenario: Duplicate URLs in Adzuna response
- **WHEN** two Adzuna results share the same redirect URL
- **THEN** only the first occurrence SHALL be included in the response
