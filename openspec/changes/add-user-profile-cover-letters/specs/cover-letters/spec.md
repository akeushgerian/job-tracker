# cover-letters

## ADDED Requirements

### Requirement: Generate a cover letter from profile and job
The system SHALL generate a cover letter for an authenticated user using their saved
profile and a supplied job posting. The job posting MAY be supplied as pasted text, as a
URL the system fetches, or derived from a linked application. Generation SHALL use the
configured local LLM in a single completion (no tool calls) and SHALL persist the
result.

#### Scenario: Generate from pasted job text
- **GIVEN** an authenticated user with a saved profile
- **WHEN** they `POST /api/cover-letters/generate` with `jobText` for a posting
- **THEN** the response is `200` with a generated `content` letter
- **AND** the letter is persisted and appears in `GET /api/cover-letters`

#### Scenario: Generation requires a profile
- **GIVEN** an authenticated user who has not saved a profile
- **WHEN** they `POST /api/cover-letters/generate` with a job posting
- **THEN** the response is an error instructing them to set up their profile first
- **AND** no cover letter is persisted

#### Scenario: Generation requires a job source
- **GIVEN** an authenticated user with a saved profile
- **WHEN** they `POST /api/cover-letters/generate` with no `jobText`, no `jobUrl`, and no resolvable application
- **THEN** the response is `400` indicating a job posting is required

#### Scenario: LLM unavailable
- **GIVEN** the local LLM cannot be reached
- **WHEN** a user requests generation
- **THEN** the response is `502` with an `LLM_UNAVAILABLE` error
- **AND** no partial cover letter is persisted

### Requirement: Job posting from a URL is best effort
When a job URL is supplied, the system SHALL attempt to fetch and extract the posting
text, and SHALL fall back gracefully when it cannot. The system SHALL NOT fetch
non-`http(s)` URLs and SHALL refuse URLs resolving to private, loopback, or link-local
addresses.

#### Scenario: URL cannot be read
- **GIVEN** an authenticated user with a profile
- **WHEN** they generate with a `jobUrl` the system cannot fetch or extract
- **THEN** the response indicates the URL could not be read and asks for pasted text
- **AND** no cover letter is persisted

#### Scenario: Private-address URL is refused
- **GIVEN** an authenticated user with a profile
- **WHEN** they generate with a `jobUrl` pointing at a private/loopback address
- **THEN** the system refuses to fetch it and returns an error

### Requirement: Format references guide output
The system SHALL let a user supply a format reference so generated letters match an
existing style and structure, and SHALL write in a clean default style when none is
supplied. A reference MAY be a saved, reusable sample owned by the user or inline text
provided at generation time.

#### Scenario: Generation with a saved reference
- **GIVEN** an authenticated user with a profile and a saved format reference
- **WHEN** they generate a letter selecting that reference
- **THEN** the generated letter follows the reference's structure and tone

#### Scenario: Free-style generation without a reference
- **GIVEN** an authenticated user with a profile and no reference selected
- **WHEN** they generate a letter
- **THEN** a letter is produced in a default professional style

### Requirement: Manage reusable format references
The system SHALL let a user create, list, update, and delete their own reusable format
references. References SHALL be scoped to the owner.

#### Scenario: Create and list references
- **GIVEN** an authenticated user
- **WHEN** they create a format reference with a label and sample content
- **THEN** it is returned and appears in their reference list

#### Scenario: References are owner-scoped
- **GIVEN** a format reference owned by user A
- **WHEN** user B attempts to read, update, or delete it
- **THEN** the system responds `404` and B's request has no effect

### Requirement: Persist and link cover letters
The system SHALL persist each generated cover letter for its owner. A letter created in
the context of an application SHALL link to that application; a letter created
standalone SHALL have no application link. Deleting a linked application SHALL NOT delete
its cover letters; the link SHALL be cleared instead.

#### Scenario: Letter linked to an application
- **GIVEN** an authenticated user generating from an application's context
- **WHEN** the letter is generated
- **THEN** the saved letter references that application
- **AND** it can be retrieved by filtering the list on that application

#### Scenario: Linked application is deleted
- **GIVEN** a saved cover letter linked to an application
- **WHEN** the application is deleted
- **THEN** the cover letter still exists and is no longer linked to any application

### Requirement: Edit and delete cover letters
The system SHALL let a user edit the content of a saved cover letter and delete it.
These operations SHALL be owner-scoped.

#### Scenario: Edit letter content
- **GIVEN** a saved cover letter owned by the user
- **WHEN** they `PATCH /api/cover-letters/:id` with new content
- **THEN** the stored content is updated and returned

#### Scenario: Cannot access another user's letter
- **GIVEN** a cover letter owned by user A
- **WHEN** user B attempts to get, edit, or delete it
- **THEN** the system responds `404`

### Requirement: Authentication required
The system SHALL require authentication for every cover-letter and reference endpoint.

#### Scenario: Unauthenticated access is rejected
- **GIVEN** a request with no valid session
- **WHEN** it calls any `/api/cover-letters` endpoint
- **THEN** the response is `401`
