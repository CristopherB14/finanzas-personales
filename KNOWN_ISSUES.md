# Known issues

Gaps, sharp edges, and intentional simplifications in the current implementation. Read this before
debugging something that might be "working as designed."

## Sync & offline

- **No conflict-resolution UI.** `docs`/older architecture notes described a `sync_conflicts` table
  for manual review — **it was never implemented**. Conflicts are resolved purely by comparing
  `updated_at` (last-write-wins) in `mergeRemoteTransactions` (`src/lib/db/local-db.ts`). A user
  editing the same transaction on two offline devices will silently lose one edit.
- **Sync only covers `transactions`.** Accounts and categories exist in the Dexie schema
  (`src/lib/db/local-db.ts`) but `sync-engine.ts` only pushes/pulls the `transactions` table. Account
  and category edits go straight to Supabase and are not available offline for writes.
- **Pull is capped at 500 rows** (`pullRemoteChanges` in `src/lib/sync/sync-engine.ts`). Fine for a
  personal-use MVP; will silently truncate history for a very active long-term user.
- **No local backup/export.** If a user clears browser storage before syncing, unsynced offline
  changes are lost permanently.

## Payments

- **Mercado Pago webhook always returns `200`**, even on internal processing errors (see the comment
  in `PaymentService.handleMercadoPagoWebhook` in `src/lib/payments/payment-service.ts`). This is
  intentional (avoids aggressive MP retry storms) but means processing failures must be found via
  logs/`payment_webhook_events.processing_status`, not via webhook response codes.
- **ARS-only checkout.** `PaymentService.createCheckout` throws if `currencyCode !== "ARS"`. USD
  expenses cannot be paid via Mercado Pago yet.
- **`back_urls` silently omitted** when `NEXT_PUBLIC_APP_URL` isn't a public HTTPS URL (e.g. plain
  `localhost` in local dev without a tunnel). Checkout still works, but the user is not redirected
  back into the app after paying — see [`docs/deploy.md`](docs/deploy.md).

## Multi-currency

- **Exchange rate source is "bna" or "manual" only.** If the BNA scrape and the dolarapi fallback
  both fail, the user must enter the rate manually — there's no cached/last-known-rate fallback.
- **Dashboard picks a single "primary currency"** (`pickPrimaryCurrency` in
  `src/lib/finance/calculations.ts`, defaults to ARS if present) to render headline KPIs. A user who
  holds meaningful balances in both ARS and USD only sees one currency's numbers on the main KPI
  cards (per-currency breakdowns are still available in the returned data).

## Auth & security

- **No rate limiting** on `/api/payments/checkout` or `/api/google-calendar/*` routes beyond
  Supabase's own auth checks.
- **CSP allows `'unsafe-inline'` for scripts** (`next.config.ts`) — required because the Next.js app
  shell emits inline scripts without a per-request nonce. This weakens CSP's protection against
  injected inline `<script>` (mitigated by the rest of the directives: `frame-ancestors 'none'`,
  `object-src 'none'`, strict `connect-src`).
- **Google OAuth tokens never expire from storage** on their own; `user_google_integrations` rows
  persist until `/api/google-calendar/disconnect` is called explicitly.

## Data model

- **Legacy rows without `original_amount_cents`** are treated as ARS at parity
  (`transactionDisplayAmountCents` in `src/lib/finance/currency.ts`) — correct for pre-multi-currency
  data, but silently wrong if such a row's `currency_code` was ever anything but `ARS`.
- **`investment_assets.market_value_cents`** has no automatic pricing feed; it only changes when a
  user manually recalculates it (`src/lib/data/investment-assets.ts`).

## Tooling

- **No automated tests, no CI.** See [`docs/testing.md`](docs/testing.md) and [`TODO.md`](TODO.md).
- **`.env` (production-style file, gitignored) is missing `MERCADOPAGO_ENV` and
  `NEXT_PUBLIC_APP_URL`** compared to `.env.local`, as observed at doc-writing time. Confirm these
  are set in the actual deployment target (Vercel dashboard), not just local files.
