## ADDED Requirements

### Requirement: Scout page accessible from nav
A "Scout" link SHALL appear in the main navigation (app shell) for authenticated users, routing to `/scout`.

#### Scenario: Nav link present when authenticated
- **WHEN** a logged-in user views any page
- **THEN** the "Scout" nav link SHALL be visible and route to `/scout`

### Requirement: Natural-language search form
The Scout page SHALL display a single text input and a search button. The input SHALL be a full-width text field with placeholder text such as "Find senior frontend jobs in Bielefeld...". Submitting the form (button click or Enter key) SHALL trigger the search.

#### Scenario: Empty query submission
- **WHEN** the user submits the form with an empty input
- **THEN** the system SHALL show an inline validation message and NOT call the API

#### Scenario: Search in progress
- **WHEN** a search is in flight
- **THEN** the button SHALL be disabled and a loading indicator SHALL be shown; the input SHALL remain editable

### Requirement: Job result cards
Each job result SHALL be displayed as a card containing: job title (prominent), company name, location, salary range (if available, else omitted), posted date (relative, e.g. "3 days ago"), and a description snippet (max 3 lines, truncated with ellipsis).

#### Scenario: Score badge visible when scoring succeeds
- **WHEN** LLM scoring has completed for a result
- **THEN** the card SHALL display a match score badge (e.g. "87% match") and the fit note beneath the snippet

#### Scenario: Score loading state
- **WHEN** the Adzuna results have arrived but LLM scoring is still in progress
- **THEN** cards SHALL render without scores, with a subtle skeleton/spinner in the score badge area

#### Scenario: No profile warning
- **WHEN** scoring is skipped due to missing profile
- **THEN** the page SHALL display a banner: "Complete your profile to get match scores" with a link to the Profile page

### Requirement: Add to Pipeline action
Each result card SHALL have an "Add to Pipeline" button. Clicking it SHALL call `POST /api/applications` with `company`, `role`, `jobUrl`, and `status: "discovered"` pre-filled from the result, then show a success toast and disable the button (replaced with "Added ✓").

#### Scenario: Successful add to pipeline
- **WHEN** the user clicks "Add to Pipeline" on a result card
- **THEN** an application is created in `Discovered` status, a success toast appears, and the button changes to "Added ✓" and becomes disabled

#### Scenario: Already added guard
- **WHEN** the user clicks "Add to Pipeline" on the same card a second time (e.g. after navigating away and back)
- **THEN** the button SHALL remain in "Added ✓" disabled state for the duration of the session (in-memory deduplication by job URL)

### Requirement: View full posting
Each result card SHALL have a secondary "View full posting" link that opens the job's redirect URL in a new tab.

#### Scenario: External link opens in new tab
- **WHEN** the user clicks "View full posting"
- **THEN** the job URL SHALL open in a new browser tab with `rel="noopener noreferrer"`

### Requirement: Error states
The Scout page SHALL handle and display errors gracefully without crashing.

#### Scenario: Search fails (API or network error)
- **WHEN** the search API call returns an error
- **THEN** an inline error message SHALL replace the result area, with a "Try again" button that re-submits the last query

#### Scenario: Adzuna credentials not configured
- **WHEN** the backend returns 503 (missing API credentials)
- **THEN** the page SHALL show a specific message: "Job search is not configured. Add ADZUNA_APP_ID and ADZUNA_API_KEY to the server environment."
