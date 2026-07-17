# Quick reference

Condensed facts to avoid re-reading source/docs for common questions. If something here conflicts
with `docs/`, `docs/` wins — this file is a cache, not the source of truth.

## Commands

```bash
npm run dev / build / start / lint    # no test/typecheck script exists
```

## Path alias

`@/*` → `./src/*`

## Key files by concern

| Concern | File |
|---|---|
| Route protection / session refresh | `src/proxy.ts` + `src/lib/supabase/middleware.ts` |
| Browser Supabase client | `src/lib/supabase/client.ts` |
| Server Supabase client (cookies) | `src/lib/supabase/server.ts` |
| Service-role Supabase client (server-only) | `src/lib/supabase/admin.ts` |
| Dexie (IndexedDB) schema | `src/lib/db/local-db.ts` |
| Sync push/pull | `src/lib/sync/sync-engine.ts` |
| Currency conversion | `src/lib/finance/currency.ts` |
| Dashboard/budget calculations | `src/lib/finance/calculations.ts` |
| Transfer validation | `src/lib/finance/transfers.ts` |
| Recurring expense date math | `src/lib/recurrence/engine.ts` |
| Payment orchestration | `src/lib/payments/payment-service.ts` |
| Core domain types | `src/types/database.ts` |
| Route path constants | `src/constants/routes.ts` |
| The only global React provider | `src/components/providers/sync-provider.tsx` |

## Route map (`src/app/`)

- Public: `/`, `/login`, `/registro`
- Authenticated shell `(app)/`: `/dashboard`, `/transacciones` (+ `nuevo/{ingreso,gasto,recurrente}`,
  `[clientId]/editar`, `recurrentes/[id]/editar`), `/cuentas`, `/categorias`, `/presupuesto`,
  `/flujo-de-caja`, `/transferencias`, `/inversiones`, `/integraciones`, `/pagos/resultado`
- Legacy (redirected in `next.config.ts`): `/gastos`, `/ingresos`, `/gastos-recurrentes`,
  `/categorias/*` → `/transacciones*`
- API (`src/app/api/`): `exchange-rate/bna`, `google-calendar/{auth,callback,status,disconnect,
  create-event}`, `payments/{checkout,status,[id]/status,mercadopago/webhook}`

## Database tables (see `docs/database.md` for full schema)

`profiles`, `accounts`, `categories`, `transactions`, `budgets`/`budget_lines` (unused — real config
is in `profiles.preferences.budget`), `recurring_expenses`, `investment_assets`,
`user_google_integrations` (service-role only), `payment_attempts`, `payment_webhook_events`
(service-role only).

## Env vars (see `docs/environment.md` for full detail)

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Optional feature flags via
presence: `SUPABASE_SERVICE_ROLE_KEY` + `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` (Google Calendar),
`MERCADOPAGO_ACCESS_TOKEN/WEBHOOK_SECRET` + `NEXT_PUBLIC_APP_URL` (payments).

## Non-obvious facts worth remembering

- No `middleware.ts` — it's `src/proxy.ts` (Next.js 16 rename).
- No `tailwind.config.*` — Tailwind v4 lives in `src/app/globals.css`.
- No REST API for transactions/accounts/categories/budgets — client hooks talk to Supabase directly.
- Money is always integer cents; currencies are `"ARS" | "USD"` only, never summed together.
- No automated tests, no CI.
