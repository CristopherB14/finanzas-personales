# Deployment

## Target platform

No `vercel.json` or `netlify.toml` is checked in, but the code assumes **Vercel**:
`src/lib/google-calendar/config.ts` reads `process.env.VERCEL_ENV` for diagnostics, and Next.js 16 +
Vercel is the default pairing. Treat platform-specific config as living in the Vercel dashboard
(env vars, domains) rather than in-repo, until someone adds a `vercel.json`.

## One-time setup

1. **Create a Supabase project** (one per environment — dev/staging/prod, not shared).
2. **Apply all migrations**, in filename order, via the Supabase SQL Editor or the Supabase CLI:
   ```bash
   # Files under supabase/migrations/, oldest timestamp first:
   # 20250602000000_initial_schema.sql
   # 20250617000000_accounts_description.sql
   # 20250619000000_investment_type.sql
   # 20250620000000_transfer_to_account.sql
   # 20250621000000_recurring_expenses.sql
   # 20250622000000_google_calendar_integration.sql
   # 20250623000000_harden_functions.sql
   # 20260711022048_multi_currency_fx.sql
   # 20260711184932_mercadopago_payments.sql
   ```
   If you have the Supabase CLI linked to the project, `supabase db push` applies any new migrations
   in order automatically.
3. **Register a Google OAuth client** (Google Cloud Console) if you want Calendar integration.
   Redirect URI must exactly match `GOOGLE_REDIRECT_URI` for that environment.
4. **Create Mercado Pago credentials** (sandbox for staging, production for prod) if you want
   payments. Configure the webhook URL in the Mercado Pago dashboard as
   `{NEXT_PUBLIC_APP_URL}/api/payments/mercadopago/webhook`.
5. **Set every environment variable** — see [`environment.md`](environment.md) for the full list and
   [`.env.example`](../.env.example) for the template.

## Deploying

```bash
npm install
npm run build   # also type-checks; fails the build on TS errors
npm run start   # or let Vercel run this via its own build/start pipeline
```

On Vercel: connect the repo, set the environment variables per environment (Preview/Production),
and deploy. There is no custom build command needed beyond the default `next build`.

## Environment-specific values

The only values that must differ between local/staging/production:

| Variable | Local | Production |
|---|---|---|
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/api/google-calendar/callback` | `https://<your-domain>/api/google-calendar/callback` |
| `NEXT_PUBLIC_APP_URL` | HTTPS tunnel (e.g. ngrok) — **not** `http://localhost`, Mercado Pago rejects it | `https://<your-domain>` |
| `MERCADOPAGO_ENV` | `sandbox` | `production` |
| `MERCADOPAGO_ACCESS_TOKEN` / `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | sandbox credentials | production credentials |

Everything else (Supabase keys) is per-Supabase-project, not per-deploy-environment — use a separate
Supabase project per environment rather than separate keys against one project.

## Mercado Pago public-URL requirement

Mercado Pago rejects `localhost`/`127.0.0.1`/plain HTTP in `back_urls` and `notification_url`. If
`NEXT_PUBLIC_APP_URL` isn't a public HTTPS URL, `src/lib/payments/payment-service.ts` silently omits
`back_urls`/`auto_return`/`notification_url` from the created preference (checkout still works, but
the user isn't redirected back and the webhook can't reach you). For local end-to-end testing of the
full payment flow, point `NEXT_PUBLIC_APP_URL` at an HTTPS tunnel (ngrok or similar) into `:3000`.

## Security headers & CSP

`next.config.ts` sets CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`, etc. on every response.
`connect-src` is derived from `NEXT_PUBLIC_SUPABASE_URL` at build time — if you change Supabase
projects, rebuild (don't just swap env vars at runtime without rebuilding, since `next.config.ts`
reads `process.env` at build time, not per-request).

## Rollback

No blue/green or migration-rollback tooling exists. Rolling back a bad deploy is a normal Vercel
redeploy of a previous build; rolling back a bad migration means writing and applying a new
corrective migration (Postgres migrations here are forward-only, see [`database.md`](database.md)).

## Post-deploy checklist

- [ ] Confirm `/api/exchange-rate/bna` returns `200` (no Supabase dependency, good smoke test).
- [ ] Log in, confirm the dashboard renders and `ensureUserSetup()` seeded categories for a new user.
- [ ] If Google Calendar is enabled: connect it from `/integraciones`, confirm `google=connected`
      redirect works with the production `GOOGLE_REDIRECT_URI`.
- [ ] If Mercado Pago is enabled: run one sandbox checkout end-to-end and confirm the webhook
      settles it into `transactions` (check `payment_webhook_events.processing_status = 'processed'`).
