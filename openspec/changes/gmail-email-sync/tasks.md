## 1. Dependencies and Environment

- [x] 1.1 Add `googleapis` package to `backend/package.json`
- [x] 1.2 Add `TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `EMAIL_SYNC_INTERVAL_MS` to `backend/.env.example` with placeholder values
- [x] 1.3 Add the same vars to the root `.env.example` for Docker compose (Demo mode awareness)

## 2. Database Schema

- [x] 2.1 Add `gmail_connections` table to `backend/src/db/schema.ts` (userId FK, encryptedAccessToken, encryptedRefreshToken, tokenExpiryDate, connectedEmail, status, createdAt, updatedAt)
- [x] 2.2 Add `email_syncs` table to schema (userId FK unique, historyId, lastSyncedAt)
- [x] 2.3 Add `email_matches` table to schema (id, userId FK, gmailMessageId unique-per-user, applicationId FK nullable, subject, sender, snippet, receivedAt, action, confidence, status enum, classificationError, createdAt)
- [x] 2.4 Add `source VARCHAR(20) DEFAULT 'manual'` and `email_match_id INT REFERENCES email_matches(id) ON DELETE SET NULL` columns to `activities` table in schema
- [x] 2.5 Run `pnpm --filter backend db:generate` to emit the migration file; commit it
- [x] 2.6 Add `email_matches` to the `TABLES` truncation list in `backend/test/setup.ts`

## 3. Token Encryption Utility

- [x] 3.1 Create `backend/src/lib/token-crypto.ts` — `encrypt(text: string): string` and `decrypt(text: string): string` using AES-256-GCM with `TOKEN_ENCRYPTION_KEY` from env; throw on missing key

## 4. Gmail OAuth Backend

- [x] 4.1 Create `backend/src/modules/email-sync/email-sync.schemas.ts` — Zod schemas for connection status DTO, sync result DTO, email match DTO
- [x] 4.2 Create `backend/src/modules/email-sync/email-sync.repository.ts` — queries for gmail_connections, email_syncs, email_matches (all scoped to userId)
- [x] 4.3 Create `backend/src/modules/email-sync/gmail.client.ts` — builds an authenticated `google.gmail` client from stored (decrypted) tokens; handles `invalid_grant` by marking connection `needs_reauth`
- [x] 4.4 Create `backend/src/modules/email-sync/email-sync.service.ts` — `getOAuthUrl()`, `handleCallback(code, state)`, `getStatus(userId)`, `disconnect(userId)`
- [x] 4.5 Create `backend/src/modules/email-sync/email-sync.controller.ts` — handlers for OAuth initiation, callback, status, disconnect, manual sync trigger
- [x] 4.6 Create `backend/src/modules/email-sync/email-sync.routes.ts` — register routes: `GET /oauth/url`, `GET /oauth/callback`, `GET /status`, `DELETE /connection`, `POST /sync`
- [x] 4.7 Register the email-sync routes in `backend/src/app.ts` under prefix `/api/email-sync`

## 5. Email Sync and Triage

- [x] 5.1 Create `backend/src/modules/email-sync/gmail.fetcher.ts` — first-sync (30-day filtered fetch, max 500) and incremental sync (History API); returns array of raw message metadata + snippet
- [x] 5.2 Create `backend/src/modules/email-sync/email-triage.ts` — builds the LLM prompt with email data + user's application list; calls `chatCompletion`; parses and validates JSON response; enforces confidence threshold and applicationId ownership check
- [x] 5.3 Add `applyTriageAction()` to `email-sync.service.ts` — dispatches to applications, interviews, contacts, activities repositories based on triage result; creates Activity with `source = 'email'`
- [x] 5.4 Create `backend/src/modules/email-sync/email-sync.poller.ts` — exports `startPoller(app)` that runs `setInterval` using `EMAIL_SYNC_INTERVAL_MS`; iterates active connections; calls fetcher → triage → applyTriageAction per user; catches and logs per-user errors
- [x] 5.5 Call `startPoller(app)` from `app.ts` after server starts (only when `GOOGLE_CLIENT_ID` env var is set)

## 6. Activities Migration Compatibility

- [x] 6.1 Update `activities.repository.ts` to include `source` and `email_match_id` in insert/select queries
- [x] 6.2 Update `activities.schemas.ts` DTO to expose `source` and `emailMatchId` fields
- [x] 6.3 Verify existing activity-creating code (applications, interviews, contacts modules) still compiles and defaults `source` to `'manual'`

## 7. Frontend — Gmail Connection

- [x] 7.1 Add Gmail connection status types to `frontend/src/lib/types.ts` (`GmailStatus`, `EmailMatch`)
- [x] 7.2 Create `frontend/src/features/email-sync/api.ts` — TanStack Query hooks: `useGmailStatus`, `useDisconnectGmail`, `useTriggerSync`, `useEmailMatches(applicationId)`
- [x] 7.3 Create `frontend/src/features/email-sync/GmailConnect.tsx` — Connect/Disconnect button that redirects to `GET /api/email-sync/oauth/url`; shows connected email address
- [x] 7.4 Create `frontend/src/routes/_authed/settings/gmail.tsx` — settings page hosting `GmailConnect` component
- [x] 7.5 Add `/settings/gmail` link to the app navigation

## 8. Frontend — Dashboard Badge

- [x] 8.1 Create `frontend/src/features/email-sync/GmailStatusBadge.tsx` — three states: connected (green), needs-reauth (amber with re-connect link), not connected (neutral with connect link)
- [x] 8.2 Add `GmailStatusBadge` to the dashboard page

## 9. Frontend — Application Emails Tab

- [x] 9.1 Create `frontend/src/features/email-sync/EmailMatchCard.tsx` — displays sender, subject, snippet, action label, confidence badge, status, received timestamp; shows Confirm/Dismiss buttons for `pending_review` matches
- [x] 9.2 Create `frontend/src/features/email-sync/EmailMatchList.tsx` — lists `EmailMatchCard` components; empty state when no matches
- [x] 9.3 Add "Emails" tab to the application detail page, rendering `EmailMatchList` with the application's `id`
- [x] 9.4 Wire `useConfirmEmailMatch` and `useDismissEmailMatch` hooks (PATCH endpoint) and connect to card buttons

## 10. Backend — Confirm/Dismiss Endpoints

- [x] 10.1 Add `PATCH /api/email-sync/matches/:id/confirm` — validates ownership, applies triage action, sets status `'applied'`
- [x] 10.2 Add `PATCH /api/email-sync/matches/:id/dismiss` — validates ownership, sets status `'ignored'`
- [x] 10.3 Add `GET /api/email-sync/matches?applicationId=:id` — returns all matches for an application, scoped to userId

## 11. Tests and Typecheck

- [x] 11.1 Write integration tests for OAuth callback (valid code, invalid state, duplicate connection)
- [x] 11.2 Write integration tests for disconnect and status endpoints
- [x] 11.3 Write unit tests for `email-triage.ts` — mock `chatCompletion`; cover: job-related match, no match, low confidence, invalid applicationId, LLM failure
- [x] 11.4 Write integration tests for confirm and dismiss endpoints
- [x] 11.5 Run `pnpm --filter backend typecheck` — fix all errors
- [x] 11.6 Run `pnpm --filter frontend typecheck` — fix all errors
- [ ] 11.7 Run `task test` (starts Docker test DB) — all tests pass
