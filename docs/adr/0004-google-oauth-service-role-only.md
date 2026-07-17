# 0004 — Google OAuth tokens: service-role only, no client RLS policy

## Context

Google Calendar integration requires storing an OAuth `access_token`/`refresh_token` per user.
These tokens grant calendar access on the user's behalf; if they leaked to the browser (even scoped
by RLS to "only the owning user can read their own tokens"), an XSS vulnerability elsewhere in the
app would let an attacker exfiltrate the token directly, not just call app APIs. Supabase's security
advisors also flagged related function-security issues (mutable `search_path`, implicit `EXECUTE`
grants) around this feature.

## Decision

`user_google_integrations` has Row Level Security **enabled with no policy at all** for
`anon`/`authenticated`, plus an explicit `REVOKE ALL ... FROM anon, authenticated`
(`supabase/migrations/20250622000000_google_calendar_integration.sql`). The table is reachable only
through the service-role client (`src/lib/supabase/admin.ts`), which is imported exclusively in
server-only code (API route handlers), and every query is manually scoped by `user_id` in
application code since the service role itself bypasses RLS. `payment_webhook_events` (added later)
follows the same pattern for the same reason (raw provider payloads, backend-only).
`supabase/migrations/20250623000000_harden_functions.sql` additionally pins `search_path` on trigger
functions and revokes their implicit `EXECUTE` grants.

## Consequences

- Even a full RLS-bypass-unaware bug in a Client Component cannot leak Google tokens, because the
  anon/authenticated Postgres roles have zero grants on the table — there is no policy to
  misconfigure.
- Every access path to this table must go through a server-only module. `createAdminClient()`
  actively throws if called with `typeof window !== "undefined"` as a defense-in-depth check.
- This is deliberately more locked-down than the "just add an RLS policy" default used for every
  other user-owned table — don't "simplify" it back to a normal RLS policy.
