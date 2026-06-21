## Context

Laufbahn runs locally against a cloud Postgres (Neon). The backend is Fastify 5 / TypeScript ESM. An LLM assistant already runs via Ollama (OpenAI-compatible `/v1` endpoint) through `modules/assistant/assistant.llm.ts`. There is no background job infrastructure today — every request is synchronous HTTP. Gmail's API uses OAuth2 with long-lived refresh tokens and a History API that returns only changes since a given `historyId`, making incremental polling cheap.

## Goals / Non-Goals

**Goals:**
- One-click Gmail connect/disconnect per user via OAuth2.
- Incremental inbox scanning every 10 minutes (no full re-scan after first sync).
- LLM classifies each new email: job-related?, application match, action type, structured extraction (interview time, contact details).
- Confident matches auto-apply pipeline changes (status, Interview row, Contact upsert, Activity entry).
- Matched emails visible in the application detail timeline.

**Non-Goals:**
- Real-time push (Gmail pub/sub requires a public HTTPS endpoint — not viable for a local app).
- Sending email from Laufbahn.
- Multi-account Gmail (one connection per user).
- Modifying or labeling Gmail messages.
- Syncing calendar events directly (interview datetimes are extracted and stored in Laufbahn's own `interviews` table).

## Decisions

### D1: Polling over Gmail Push Notifications
**Decision**: Use a server-side polling loop (Node `setInterval` on startup) rather than Gmail pub/sub webhooks.

**Rationale**: Laufbahn runs locally without a stable public URL. Pub/sub requires Google to POST to a verified HTTPS endpoint. Polling every 10 min is cheap via the History API (one API call per active user per cycle, returning only deltas).

**Alternative considered**: Cloudflare Tunnel or ngrok to expose a local webhook — rejected as an operational burden on a portfolio app.

### D2: Gmail History API over full SEARCH
**Decision**: On first sync, fetch the last 30 days of messages matching `subject:(application OR interview OR offer OR rejection OR opportunity)`. On subsequent syncs, call `users.history.list` with the stored `historyId` to get only new messages.

**Rationale**: History API is O(new messages), not O(inbox size). The initial label-filtered fetch bounds the first-run cost.

**Alternative considered**: Always search with a query — simpler but re-scans the entire inbox every cycle.

### D3: LLM triage via existing Ollama integration
**Decision**: Reuse `assistant.llm.ts#chatCompletion` with a structured JSON prompt. Pass email metadata (from, subject, snippet, body up to 2 000 chars) + the user's application list (company, role, status) as context. Request a JSON response with fields: `jobRelated`, `applicationId|null`, `confidence` (0–1), `action` (`status_change|interview_invite|offer|rejection|follow_up|none`), `newStatus|null`, `interviewAt|null`, `contactName|null`, `contactRole|null`.

**Rationale**: Keeps all data local (no third-party AI). The structured prompt mirrors how the assistant already works.

**Alternative considered**: Rule-based keyword matching — faster but brittle; misses nuanced phrasing and won't handle localized/non-English emails.

**Confidence threshold**: Auto-apply actions only when `confidence >= 0.85`. Below threshold, log the match as `pending_review` and surface it in the UI for manual confirmation.

### D4: Token storage — encrypted in DB, not env-file
**Decision**: Store the OAuth2 `access_token`, `refresh_token`, and `expiry_date` in a `gmail_connections` table, encrypted with AES-256-GCM using a `TOKEN_ENCRYPTION_KEY` from env. The key is 32 bytes, base64-encoded.

**Rationale**: Tokens are per-user and must survive restarts. File-per-user storage in env vars doesn't scale even to two users. Encryption at rest protects against DB-level leaks.

**Alternative considered**: Store tokens in a local file (`~/.laufbahn/tokens/<userId>.json`) — simpler but outside the app's Neon DB, breaks in Docker Demo mode.

### D5: Polling lifecycle — Node setInterval on app boot
**Decision**: Register a global interval in `app.ts` after the Fastify instance starts. The poller iterates over all users with active `gmail_connections`, runs triage for each, and commits results. Interval: 10 minutes (configurable via `EMAIL_SYNC_INTERVAL_MS` env var).

**Rationale**: No additional infrastructure (no BullMQ, no cron service). Acceptable for a single-user portfolio app.

**Alternative considered**: Per-request lazy sync ("sync when you open the app") — less predictable; user may miss time-sensitive emails.

### D6: Activity source extension
**Decision**: Add `source VARCHAR(20) DEFAULT 'manual'` and `email_match_id INTEGER REFERENCES email_matches(id) ON DELETE SET NULL` to the `activities` table. Existing rows get `source = 'manual'` via migration default.

**Rationale**: Preserves audit trail of what triggered each activity. Avoids a separate "email activities" table.

## Risks / Trade-offs

- **Gmail API quota** → Mitigation: History API calls count against a 1 billion units/day quota; one call per user per 10 min is negligible. Monitor via Google Cloud console.
- **Refresh token expiry** → Mitigation: `googleapis` client auto-refreshes; on `invalid_grant` error, mark connection as `needs_reauth` and surface a re-connect prompt in UI.
- **LLM hallucinating applicationId** → Mitigation: Validate that `applicationId` returned by LLM exists and belongs to the user before applying any action. Mismatches force `pending_review`.
- **Ollama not running** → Mitigation: If LLM call fails, email is queued as `pending_review` rather than dropped or erroring the poller.
- **First-sync cost** → Mitigation: Initial fetch is bounded to 30 days with a subject filter; capped at 500 messages. If user has more, first sync batches and continues on next cycle.
- **Token encryption key loss** → Mitigation: If `TOKEN_ENCRYPTION_KEY` changes, tokens become unreadable and users must re-authorize. Document this clearly; provide a `task gmail:reset` command that clears all connections.

## Migration Plan

1. Generate and apply DB migration: new tables `gmail_connections`, `email_syncs`, `email_matches`; alter `activities` for `source` + `email_match_id`.
2. Add `TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` to `backend/.env.example`.
3. Register `email-sync` routes in `app.ts`; register startup poller.
4. Deploy frontend changes (connection UI, timeline tab).

**Rollback**: If the integration causes issues, remove the poller registration in `app.ts` and hide the frontend entry points behind a `GMAIL_ENABLED=true` env flag. DB tables and existing email_match rows are inert without the poller.

## Open Questions

- **OAuth consent screen verification**: Google requires app verification for production Gmail scopes. For a personal portfolio app with one user (yourself), staying in "Testing" mode (up to 100 test users) is sufficient — no verification needed.
- **Sync on Docker Demo mode**: The demo DB does not have real Gmail credentials. The poller should no-op gracefully when no connections exist (it already will). Decide whether to expose the Gmail UI in demo mode at all.
