## MODIFIED Requirements

### Requirement: Activities record their source
Activities SHALL carry a `source` field indicating how they were created, and optionally a reference to the email match that triggered them.

#### Scenario: Manually created activity has source 'manual'
- **WHEN** an activity is created through the application UI or the assistant's write actions
- **THEN** the activity's `source` field SHALL be `'manual'`

#### Scenario: Email-triggered activity has source 'email'
- **WHEN** an email match with `status = 'applied'` triggers a pipeline action (status change, interview creation, etc.)
- **THEN** the system SHALL create an activity with `source = 'email'` and `email_match_id` set to the corresponding `email_matches.id`

#### Scenario: Existing activities retain source 'manual' after migration
- **WHEN** the database migration adds the `source` column
- **THEN** all pre-existing activity rows SHALL have `source = 'manual'` (applied via migration default)

#### Scenario: Deleting an email match nullifies the activity reference
- **WHEN** an `email_matches` row is deleted
- **THEN** the `email_match_id` on any linked activity rows SHALL be set to `NULL` (ON DELETE SET NULL), and those activities SHALL remain in the database
