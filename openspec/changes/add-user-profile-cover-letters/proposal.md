# Add User Profile & AI Cover Letter Generation

## Why

Laufbahn already tracks applications and has a local-LLM assistant, but it knows
nothing about *the user*. Every assistant interaction starts cold, and there is no
way to turn "this job + who I am" into an actual application artifact.

Two gaps, one workflow:

1. **No user context.** There is no place for the user to record who they are, what
   they are looking for (branch, seniority, target role), their CV summary, skills,
   and links — the "`CLAUDE.md` of the user". This context is the single most
   valuable input for any AI-assisted writing.
2. **No cover-letter support.** Writing a tailored cover letter per posting is the
   most repetitive, highest-friction step of applying. The data to do it well
   (profile + the job) already lives in the app or can be pasted in.

This change adds a **User Profile** and an **AI Cover Letter** feature that consumes
it, reusing the existing Ollama-backed LLM integration.

## What Changes

### User Profile (new capability `user-profile`)
- A single profile per user with **structured fields** (headline, target role,
  branch/industry, seniority, location, remote preference, key skills, links) **plus
  a freeform markdown block** ("about me / CV summary").
- REST endpoints to read and upsert the profile (`GET`/`PUT /api/profile`).
- A Profile page in the frontend with a form, reachable from the app shell.

### Cover Letters (new capability `cover-letters`)
- **Generate** a cover letter from: the user profile + a job (pasted text **or** a
  URL the backend best-effort fetches and extracts) + optional **format references**
  (reusable style samples, or an inline sample) so the AI matches an existing format,
  free-style otherwise.
- **Persist** each generated letter, optionally linked to an application. Two entry
  points: from an application card/detail in the swim lane, and a standalone
  "Apply to a job" action.
- Manage reusable **format references** (saved sample letters) under the profile.
- REST endpoints: generate, list, get, update (edit text), delete cover letters; and
  CRUD-lite for references.
- Frontend: a "Write cover letter" dialog/flow with job input, reference picker, and
  an editable result; a list of saved letters.

### Non-goals
- No external auth/scraping of login-walled job boards (URL fetch is best-effort,
  falls back to paste).
- No PDF/DOCX export, no email sending, no multi-language translation pass (the LLM
  may still write in the posting's language).
- No résumé/CV file upload or parsing — the CV summary is entered as text.
- No streaming responses; generation is a single request like the existing assistant.

## Impact

- **Affected specs:** new `user-profile` and `cover-letters` capabilities.
- **Database:** new tables `user_profiles`, `cover_letters`, `cover_letter_references`
  (Drizzle schema + one generated migration). Reuses `remote_type` enum semantics.
- **Backend:** new `profile` and `cover-letters` modules following the existing
  routes/controller/service/repository/schemas layering; reuses
  `assistant.llm.ts#chatCompletion` and `config.LLM_*`. Adds a guarded URL-fetch
  helper (`lib/job-fetch.ts`) with SSRF protections.
- **Frontend:** new `profile` and `cover-letters` features, a Profile route, a nav
  entry, and a cover-letter entry point on application cards/detail.
- **No breaking changes** to existing endpoints.
