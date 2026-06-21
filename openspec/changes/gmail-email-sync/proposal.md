## Why

Job seekers receive critical application updates — interview invites, rejections, offer letters, follow-up requests — by email, but currently must manually update Laufbahn after each one. This creates friction and means the pipeline falls out of sync with reality. Connecting Gmail closes that gap automatically.

## What Changes

- New **Gmail OAuth2 connection flow** lets users link their Google account to Laufbahn (stored per-user, revocable).
- New **background email sync** polls Gmail every 10 minutes using Gmail's History API (sync tokens, no re-scanning), processing only new messages since last sync.
- New **LLM email triage** classifies each new email: is it job-related? Which application does it belong to? What action should it trigger?
- **Auto-actions** applied on confident matches: pipeline status update, activity log entry, Interview record creation (for invite emails), Contact upsert (for recruiter emails).
- **Application timeline** surfaces matched emails inline — subject, sender, snippet, detected action — so users can see what triggered each change.
- **Dashboard badge** shows Gmail connection status and last-sync timestamp.

## Capabilities

### New Capabilities

- `gmail-connection`: OAuth2 authorization flow — connect, inspect status, and revoke the Gmail integration per user.
- `email-sync`: Background Gmail polling using History API sync tokens; deduplication; per-user sync state stored in DB.
- `email-triage`: LLM-based classification of raw emails against the user's tracked applications; extracts action, matched application, confidence, and structured data (interview datetime, contact name/role).
- `email-timeline`: Email match records stored and surfaced in the application activity feed and a dedicated "Emails" tab on the application detail page.

### Modified Capabilities

- `activities`: Email-triggered events are a new activity source type (`source: "email"`); existing activity schema extends to carry an optional `emailMatchId` foreign key.

## Impact

- **New backend module**: `backend/src/modules/email-sync/` (routes, controller, service, repository, schemas).
- **New DB tables**: `gmail_connections` (OAuth tokens per user), `email_syncs` (per-user sync state + history token), `email_matches` (classified emails linked to applications).
- **New migration**: schema additions above + `source` column + `email_match_id` FK on `activities`.
- **Dependencies added**: `googleapis` (Google OAuth2 + Gmail API client).
- **Frontend**: new `features/email-sync/` (connection flow, status badge); application detail gains "Emails" tab; dashboard gains Gmail status widget.
- **Env vars**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` added to `backend/.env`.
- **Security**: OAuth tokens stored encrypted at rest (AES-256-GCM); SSRF guard already covers job-fetch, not applicable here. Refresh token rotation handled by Google client library.
