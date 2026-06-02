# user-profile

## ADDED Requirements

### Requirement: Single profile per user
The system SHALL store at most one profile per authenticated user, combining structured
fields and a freeform markdown summary. The profile SHALL include: headline, target
role, branch/industry, seniority, location, remote preference (onsite|hybrid|remote or
none), a list of key skills, a set of links (LinkedIn, GitHub, portfolio, website), and
a freeform markdown "about me / CV summary" block. All fields except the owning user are
optional.

#### Scenario: A user without a profile reads their profile
- **GIVEN** an authenticated user who has never saved a profile
- **WHEN** they `GET /api/profile`
- **THEN** the response is `200` with a `null` body (not a `404`)

#### Scenario: Profile is scoped to the owner
- **GIVEN** two authenticated users, each with a saved profile
- **WHEN** user A reads `GET /api/profile`
- **THEN** the response contains only user A's profile and never user B's data

### Requirement: Upsert profile
The system SHALL let a user create or replace their profile in a single idempotent
operation. Saving twice SHALL NOT create a second profile row for the same user.

#### Scenario: First save creates the profile
- **GIVEN** an authenticated user with no profile
- **WHEN** they `PUT /api/profile` with valid fields
- **THEN** the profile is created and returned with `200`
- **AND** a subsequent `GET /api/profile` returns the same data

#### Scenario: Second save replaces, does not duplicate
- **GIVEN** an authenticated user who already has a profile
- **WHEN** they `PUT /api/profile` with changed fields
- **THEN** the existing profile is updated in place
- **AND** the user still has exactly one profile

### Requirement: Profile input validation
The system SHALL validate profile input at the API edge and reject malformed payloads
with `400`. Skills SHALL be a list of strings, links SHALL be valid URLs when present,
and remote preference SHALL be one of the allowed values or absent.

#### Scenario: Invalid link is rejected
- **GIVEN** an authenticated user
- **WHEN** they `PUT /api/profile` with a `links.linkedin` that is not a valid URL
- **THEN** the response is `400` and no profile is written

### Requirement: Authentication required
The system SHALL require authentication for every profile endpoint.

#### Scenario: Unauthenticated profile access is rejected
- **GIVEN** a request with no valid session
- **WHEN** it calls `GET /api/profile` or `PUT /api/profile`
- **THEN** the response is `401`
