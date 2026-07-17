# Authentication

Two independent auth systems exist: **app login** (Supabase Auth, required to use the app) and
**Google Calendar OAuth** (optional, per-feature integration). Don't confuse them.

## App login (Supabase Auth)

Email + password only. No magic links, no social login, no MFA.

### Sign up

`src/app/registro/page.tsx` → `supabase.auth.signUp({ email, password, options: { data: {
display_name, default_currency: "ARS" } } })`.

The `handle_new_user()` Postgres trigger (`supabase/migrations/20250602000000_initial_schema.sql`)
fires on `auth.users` insert and creates the matching `profiles` row, reading `display_name` and
`default_currency` out of `raw_user_meta_data`.

On first login, `ensureUserSetup()` (`src/lib/data/seed-user.ts`, invoked from
`SyncProvider`) seeds default expense/income categories and migrates any orphaned data — this is
where new users get their starter category set, not the signup form.

### Sign in

`src/app/login/page.tsx` → `supabase.auth.signInWithPassword({ email, password })`, then
`router.push("/dashboard")`.

### Client session access

- **Client Components**: `src/hooks/use-user.ts` — calls `supabase.auth.getUser()` once, then
  subscribes to `onAuthStateChange` for live updates. Use this hook, don't re-implement session
  polling.
- **Server Components / Route Handlers**: `src/lib/supabase/server.ts` — `createClient()` builds a
  server-side Supabase client bound to the Next.js cookie store (`await cookies()`), then call
  `supabase.auth.getUser()`.
- **Browser-only client factory**: `src/lib/supabase/client.ts` — `createBrowserClient` with the
  public anon key. Safe to use anywhere in Client Components; RLS enforces per-user isolation.

### Sign out

`src/components/layout/app-nav.tsx` calls `supabase.auth.signOut()`, then redirects to `/login`.

### Route protection

There is **no `middleware.ts`**. Next.js 16 renamed the convention to a "proxy" entry point:

```1:12:src/proxy.ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

`updateSession()` (`src/lib/supabase/middleware.ts`) runs on every matched request:

1. Refreshes the Supabase session cookie (required so server components see a fresh session).
2. Computes `isPublic`: `/`, `/login`, `/registro`, `/api/exchange-rate/*`,
   `/api/payments/mercadopago/webhook`.
3. Unauthenticated + not public → redirect to `/login`.
4. Authenticated + on `/login` or `/registro` → redirect to `/dashboard`.

Everything under `/(app)/*` (dashboard, transacciones, cuentas, etc.) is implicitly private simply by
not being in the public list — there's no separate allowlist to maintain per route.

API routes that need auth check it themselves (`supabase.auth.getUser()` → `401` if null); the proxy
only handles page-level redirects and cookie refresh, it does not block API requests.

### Session storage

Supabase Auth stores the session in cookies (via `@supabase/ssr`), not `localStorage` — this is what
lets Server Components and Route Handlers read the session without a client-side round trip.

## Google Calendar OAuth (separate, optional)

This is **not** how users log into the app — it's a per-user integration for syncing recurring
expenses/transactions to Google Calendar. See [`api.md`](api.md#google-calendar) for the route
contracts.

- Flow: `GET /api/google-calendar/auth` (sets `google_oauth_state` cookie, redirects to Google) →
  user consents → `GET /api/google-calendar/callback` (validates `state`, exchanges `code` for
  tokens) → tokens upserted into `user_google_integrations`.
- **Tokens never reach the browser.** `user_google_integrations` has RLS enabled with **no**
  client-facing policy, plus an explicit `REVOKE ALL ... FROM anon, authenticated`
  (`supabase/migrations/20250622000000_google_calendar_integration.sql`). Only the service-role
  admin client (`src/lib/supabase/admin.ts`, server-only) can read/write this table, and every query
  is scoped by `user_id` in application code (`src/lib/google-calendar/tokens.ts`).
  This is a deliberate defense-in-depth choice — see
  [`docs/adr/0004-google-oauth-service-role-only.md`](adr/0004-google-oauth-service-role-only.md).
- Token refresh: `getValidAccessToken()` (`src/lib/google-calendar/tokens.ts`) refreshes expired
  access tokens using the stored `refresh_token` before each calendar API call.
- Disconnect: `DELETE /api/google-calendar/disconnect` deletes the stored row.

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely — see the constraint in
  [`CLAUDE.md`](../CLAUDE.md#constraints--must-never-change-without-an-explicit-decision): never
  import `src/lib/supabase/admin.ts` into browser-bundled code.
- The Mercado Pago webhook is public and authenticated by HMAC signature, not a Supabase session —
  see [`api.md`](api.md#post-apipaymentsmercadopagowebhook-also-get-for-health-check).
