## ADDED Requirements

### Requirement: User can connect their Gmail account
The system SHALL provide an OAuth2 authorization flow that links the user's Google account to their Laufbahn profile, storing the resulting tokens encrypted in the database.

#### Scenario: Initiate OAuth flow
- **WHEN** an authenticated user visits the Gmail connection settings page and clicks "Connect Gmail"
- **THEN** the system SHALL redirect the user to Google's OAuth2 consent screen with scopes `gmail.readonly` and `gmail.metadata`

#### Scenario: OAuth callback succeeds
- **WHEN** Google redirects back to the app's callback URL with a valid authorization code
- **THEN** the system SHALL exchange the code for access and refresh tokens, encrypt and store them in `gmail_connections`, and redirect the user to the settings page with a success indicator

#### Scenario: OAuth callback with invalid state
- **WHEN** the callback URL receives a `state` parameter that does not match the CSRF token stored in the user's session
- **THEN** the system SHALL reject the request with HTTP 400 and not persist any tokens

#### Scenario: View connection status
- **WHEN** an authenticated user requests `GET /api/email-sync/status`
- **THEN** the system SHALL return whether a Gmail connection exists for that user, the connected email address, the last successful sync timestamp, and whether re-authorization is needed

### Requirement: User can disconnect their Gmail account
The system SHALL allow users to revoke Laufbahn's Gmail access, deleting stored tokens and halting future syncs for that user.

#### Scenario: Disconnect removes stored tokens
- **WHEN** an authenticated user sends `DELETE /api/email-sync/connection`
- **THEN** the system SHALL delete the row from `gmail_connections`, delete the corresponding row from `email_syncs`, and return HTTP 204

#### Scenario: Disconnect does not delete existing email matches
- **WHEN** a user disconnects Gmail
- **THEN** previously matched emails and their associated activities SHALL remain in the database unchanged

### Requirement: Re-authorization is surfaced when tokens expire
The system SHALL detect when a refresh token is invalid and notify the user to reconnect, without crashing the sync poller.

#### Scenario: Invalid grant detected during sync
- **WHEN** the Gmail API returns an `invalid_grant` error during a sync cycle
- **THEN** the system SHALL mark the `gmail_connections` row with `status = 'needs_reauth'`, stop attempting syncs for that user, and the next `GET /api/email-sync/status` response SHALL include `needsReauth: true`
