# Environment variables

Copy [`.env.example`](../.env.example) to `.env.local` for development. Never commit real values —
`.gitignore` already excludes `.env*`.

| Variable | Required | Public? | Used in | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public | `lib/supabase/{client,server,admin}.ts`, `lib/supabase/middleware.ts`, `next.config.ts` (CSP `connect-src`) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public | `lib/supabase/{client,server}.ts`, `lib/supabase/middleware.ts` | RLS-scoped anon key for browser/session-bound requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for Google Calendar / payments) | **Secret, server-only** | `lib/supabase/admin.ts` | Bypasses RLS. Never expose to the browser. Used for OAuth token storage and payment settlement |
| `GOOGLE_CLIENT_ID` | Only if using Google Calendar | Secret | `lib/google-calendar/config.ts` | OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Only if using Google Calendar | **Secret, server-only** | `lib/google-calendar/config.ts` | OAuth2 client secret |
| `GOOGLE_REDIRECT_URI` | Only if using Google Calendar | Secret (not sensitive, but env-specific) | `lib/google-calendar/config.ts` | Must exactly match a redirect URI registered on the Google OAuth client. `http://localhost:3000/api/google-calendar/callback` locally |
| `MERCADOPAGO_ACCESS_TOKEN` | Only if using payments | **Secret, server-only** | `lib/payments/providers/mercadopago/config.ts` | Server-to-server Mercado Pago API auth |
| `MERCADOPAGO_WEBHOOK_SECRET` | Only if using payments | **Secret, server-only** | `lib/payments/providers/mercadopago/adapter.ts` (signature verification) | Verifies `x-signature` on incoming webhooks |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Optional | Public | Reserved for client-side Mercado Pago SDK (Bricks) | Not required for the current Checkout Pro redirect flow |
| `MERCADOPAGO_ENV` | Optional (defaults to `sandbox`) | Public | `lib/payments/providers/mercadopago/config.ts` | `sandbox` or `production` |
| `NEXT_PUBLIC_APP_URL` | Required for full Mercado Pago flow | Public | `lib/payments/providers/mercadopago/urls.ts`, `lib/brand.ts` (`getSiteUrl`) | Public HTTPS origin used for payment `back_urls`/`notification_url`. Must not be `localhost` |

Platform-provided (not set manually): `NODE_ENV`, `VERCEL_ENV` (read in
`lib/google-calendar/config.ts` for diagnostics).

## Rules of thumb

- Anything without `NEXT_PUBLIC_` is server-only and will not be inlined into the browser bundle by
  Next.js — keep it that way. Never rename a secret to add a `NEXT_PUBLIC_` prefix.
- `SUPABASE_SERVICE_ROLE_KEY` is the single most sensitive value in this app — it bypasses every RLS
  policy. Treat it like a root database password.
- If a feature's env vars are unset, the app degrades gracefully rather than crashing: Google
  Calendar routes return "not connected"/`503`-style errors, Mercado Pago checkout returns `503`
  configured-false. You do not need every variable set to run `npm run dev` for core features.

## Verifying configuration

- Supabase: `npm run dev` and try to sign up — if `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` are wrong,
  auth calls will fail immediately.
- Google Calendar: visit `/integraciones` and try "Connect" — misconfiguration returns a `500` from
  `/api/google-calendar/auth` with a message naming the missing variable.
- Mercado Pago: `GET /api/payments/status` returns `{ configured: false }` if
  `MERCADOPAGO_ACCESS_TOKEN` is unset.
