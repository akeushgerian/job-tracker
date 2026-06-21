## ADDED Requirements

### Requirement: Each new email is classified by the LLM
The system SHALL pass each new email's metadata and content to the local LLM and parse a structured JSON classification response.

#### Scenario: Email is classified as job-related with a matched application
- **WHEN** the LLM returns `jobRelated: true`, a valid `applicationId` owned by the user, and `confidence >= 0.85`
- **THEN** the system SHALL store the match in `email_matches` with `status = 'applied'` and proceed to execute the indicated action

#### Scenario: Email is classified as job-related but no application matched
- **WHEN** the LLM returns `jobRelated: true` but `applicationId: null` or `confidence < 0.85`
- **THEN** the system SHALL store the match in `email_matches` with `status = 'pending_review'` and take no automatic action

#### Scenario: Email is classified as not job-related
- **WHEN** the LLM returns `jobRelated: false`
- **THEN** the system SHALL store the match in `email_matches` with `status = 'ignored'` and take no further action

#### Scenario: LLM returns invalid applicationId
- **WHEN** the LLM response includes an `applicationId` that does not exist in the user's applications
- **THEN** the system SHALL override to `applicationId: null`, set `status = 'pending_review'`, and log a warning

#### Scenario: LLM call fails or times out
- **WHEN** the local Ollama endpoint is unreachable or returns a non-parseable response
- **THEN** the system SHALL store the email in `email_matches` with `status = 'pending_review'` and `classificationError` containing the error message

### Requirement: Triage extracts structured data for auto-actions
The system SHALL request and use the following structured fields from the LLM classification response to drive downstream actions.

#### Scenario: Interview invite detected
- **WHEN** the LLM returns `action: 'interview_invite'` and a parseable `interviewAt` datetime
- **THEN** the system SHALL create an `interviews` row linked to the matched application with the extracted datetime and type defaulting to `'phone'`

#### Scenario: Rejection detected
- **WHEN** the LLM returns `action: 'rejection'` with `confidence >= 0.85`
- **THEN** the system SHALL update the matched application's status to `'rejected'`

#### Scenario: Offer detected
- **WHEN** the LLM returns `action: 'offer'` with `confidence >= 0.85`
- **THEN** the system SHALL update the matched application's status to `'offer_received'`

#### Scenario: Contact name extracted
- **WHEN** the LLM returns a non-null `contactName` and/or `contactRole`
- **THEN** the system SHALL upsert a row in `contacts` linked to the matched application using the extracted name, email address (from the email `From` header), and role

### Requirement: Confidence threshold gates automatic actions
The system SHALL only apply pipeline-modifying actions automatically when the LLM confidence meets or exceeds 0.85; lower-confidence matches are stored for manual review.

#### Scenario: Low-confidence match stored for review
- **WHEN** `confidence < 0.85` regardless of `action` type
- **THEN** the system SHALL set `email_matches.status = 'pending_review'` and not modify any application, interview, or contact record

#### Scenario: High-confidence match with no recognized action
- **WHEN** `confidence >= 0.85` and `action = 'none'` or `action = 'follow_up'`
- **THEN** the system SHALL log an activity entry only (no status change or new records)
