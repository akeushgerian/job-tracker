## ADDED Requirements

### Requirement: System performs incremental Gmail polling
The system SHALL poll Gmail for new messages on a configurable interval using the Gmail History API, processing only messages not yet seen since the last sync.

#### Scenario: First sync fetches recent messages
- **WHEN** a user connects Gmail and the poller runs for the first time for that user
- **THEN** the system SHALL fetch messages from the last 30 days matching the subject filter `(application OR interview OR offer OR rejection OR opportunity OR position OR candidate)`, capped at 500 messages, and store the resulting `historyId` in `email_syncs`

#### Scenario: Subsequent syncs use historyId
- **WHEN** the poller runs for a user who already has an `email_syncs` row with a valid `historyId`
- **THEN** the system SHALL call `users.history.list` with that `historyId` and process only the delta messages returned

#### Scenario: No new messages since last sync
- **WHEN** Gmail History API returns an empty history list
- **THEN** the system SHALL update `last_synced_at` in `email_syncs` and exit the cycle without creating any email_match records

#### Scenario: Polling interval is configurable
- **WHEN** the `EMAIL_SYNC_INTERVAL_MS` environment variable is set
- **THEN** the poller SHALL use that value as the interval in milliseconds; if unset, the default SHALL be 600000 (10 minutes)

#### Scenario: Poller skips users without active connections
- **WHEN** the poller cycle runs and a user has no row in `gmail_connections` or their connection has `status = 'needs_reauth'`
- **THEN** the system SHALL skip that user entirely without error

### Requirement: Email deduplication prevents double-processing
The system SHALL ensure each Gmail message ID is processed at most once per user, regardless of how many sync cycles run.

#### Scenario: Duplicate message ID is ignored
- **WHEN** a Gmail message ID already exists in `email_matches` for the same user (in any status)
- **THEN** the system SHALL skip that message and not create a duplicate record

### Requirement: Sync failures are isolated per user
The system SHALL continue processing other users if one user's sync cycle throws an unhandled error.

#### Scenario: One user sync fails
- **WHEN** the Gmail API or LLM triage throws an error for user A during a poller cycle
- **THEN** the system SHALL log the error, skip user A for that cycle, and continue processing all remaining users in that cycle

### Requirement: Manual sync trigger is available
The system SHALL expose an endpoint allowing users to trigger a sync on demand without waiting for the next scheduled cycle.

#### Scenario: Manual sync requested
- **WHEN** an authenticated user sends `POST /api/email-sync/sync`
- **THEN** the system SHALL immediately run the sync cycle for that user and return the count of new email matches found
