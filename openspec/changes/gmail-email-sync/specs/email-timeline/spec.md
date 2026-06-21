## ADDED Requirements

### Requirement: Matched emails appear in the application activity feed
The system SHALL include email match events in the activity timeline for the linked application, alongside manually created activities.

#### Scenario: Email match activity shown in timeline
- **WHEN** an email match with `status = 'applied'` is linked to an application
- **THEN** `GET /api/applications/:id/activities` SHALL include an activity entry with `source = 'email'`, the email subject, sender display name, detected action label, and a timestamp matching the email's received date

#### Scenario: Pending-review matches not shown in timeline
- **WHEN** an email match has `status = 'pending_review'`
- **THEN** it SHALL NOT appear in the application's activity feed until a user confirms or dismisses it

### Requirement: Application detail page has an Emails tab
The system SHALL add an "Emails" tab to the application detail page listing all email matches for that application.

#### Scenario: Emails tab shows all matches
- **WHEN** a user opens the "Emails" tab on an application detail page
- **THEN** the frontend SHALL display all `email_matches` rows linked to that application in reverse chronological order, showing: sender, subject, snippet, detected action, confidence score, status badge, and received timestamp

#### Scenario: Pending-review match can be confirmed
- **WHEN** a user clicks "Confirm" on a `pending_review` email match
- **THEN** the system SHALL apply the indicated action (status change, interview creation, etc.) and update `email_matches.status` to `'applied'`

#### Scenario: Pending-review match can be dismissed
- **WHEN** a user clicks "Dismiss" on a `pending_review` email match
- **THEN** the system SHALL set `email_matches.status = 'ignored'` and take no pipeline action

### Requirement: Dashboard shows Gmail connection status
The system SHALL display a Gmail sync status widget on the dashboard indicating connection state and last sync time.

#### Scenario: Gmail connected and syncing normally
- **WHEN** the user has an active Gmail connection with no errors
- **THEN** the dashboard SHALL show a green "Gmail connected" badge with the last sync timestamp

#### Scenario: Gmail needs re-authorization
- **WHEN** `gmail_connections.status = 'needs_reauth'`
- **THEN** the dashboard SHALL show an amber "Re-connect Gmail" badge with a link to the connection settings

#### Scenario: Gmail not connected
- **WHEN** the user has no row in `gmail_connections`
- **THEN** the dashboard SHALL show a neutral "Connect Gmail" prompt with a link to initiate the OAuth flow
