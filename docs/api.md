# API routes

Most domain CRUD (transactions, accounts, categories, budgets, recurring expenses) is **not** served
here — client hooks in `src/hooks/` talk to Supabase directly with the anon key, scoped by RLS. See
[`database.md`](database.md) for those tables. The routes below exist only where server-only secrets
or third-party webhooks are involved.

All handlers live under `src/app/api/` and run with `export const runtime = "nodejs"` unless noted.
Auth (when required) is `supabase.auth.getUser()` via `src/lib/supabase/server.ts` (cookie session).

## Exchange rate

### `GET /api/exchange-rate/bna`

Public, no auth. `src/app/api/exchange-rate/bna/route.ts`. `dynamic = "force-dynamic"`, no caching.

Fetches the BNA ("billetes venta") USD/ARS rate (`src/lib/finance/bna-rate.ts`: dolarapi.com first,
BNA HTML page as fallback).

- **200**: `{ currency, rate, compra, venta, asOf, source: "bna" }`
- **502**: `{ error: string }` — both sources failed.

## Google Calendar

All routes require a Supabase session; unauthenticated requests to `/auth` redirect to `/login`,
others return `401 { error: "Unauthorized" }`. Tokens are stored server-side only
(`user_google_integrations`, service-role access only — see [`auth.md`](auth.md)).

### `GET /api/google-calendar/auth`

Starts the OAuth flow: sets a `google_oauth_state` cookie, redirects to Google's consent screen.
Redirects unauthenticated users to `/login?redirect=/integraciones`. `500 { error }` if
`GOOGLE_CLIENT_ID`/`GOOGLE_REDIRECT_URI` aren't configured.

### `GET /api/google-calendar/callback`

OAuth redirect target. Query: `code`, `state`, optional `error`. Validates `state` against the
cookie, exchanges `code` for tokens, upserts `user_google_integrations`.

- Success → redirect `/integraciones?google=connected`
- Failure → redirect `/integraciones?google=error&message=<reason>`, where reason is one of
  `missing_code`, `invalid_state`, `token_exchange_failed`, `storage_not_configured`, etc.

### `GET /api/google-calendar/status`

- **200**: `{ connected: boolean, calendar_id: string | null }`. Fails closed (`connected: false`)
  on any internal error.

### `POST /api/google-calendar/create-event`

Body (Zod `createEventBodySchema`, `src/lib/google-calendar/validation.ts`):

```ts
{
  user_id?: string;    // uuid — must equal the session user if present (else 403)
  client_id?: string;  // uuid — transaction client_id to stamp with the created google_event_id
  transaction: {
    title: string;              // 1–300 chars
    description?: string;       // ≤2000 chars
    amount: number;              // 0 to 1e12
    currency?: string;           // 2–8 letters, e.g. "ARS"
    date: string;                // YYYY-MM-DD
    type: "income" | "expense" | "recurring";
    recurrence?: string | { freq: "DAILY"|"WEEKLY"|"MONTHLY"|"YEARLY"; interval: number; until?: string };
  };
}
```

- **200**: `{ google_event_id: string }`
- **400**: `{ error: "Google Calendar not connected" }`
- **403**: `{ error: "Forbidden" }` — `user_id` mismatch
- **502**: `{ error: "Failed to create calendar event" }`

### `DELETE /api/google-calendar/disconnect`

Deletes the stored tokens for the current user. **200**: `{ disconnected: true }`.

## Payments (Mercado Pago)

Business logic lives in `src/lib/payments/payment-service.ts`. See [`domain.md`](domain.md) for the
settlement guarantees and [`KNOWN_ISSUES.md`](../KNOWN_ISSUES.md) for edge cases.

### `POST /api/payments/checkout`

Creates a `payment_attempts` row and a Mercado Pago Checkout Pro preference.

- **401** if no session. **503** `{ error: "Mercado Pago no está configurado" }` if
  `MERCADOPAGO_ACCESS_TOKEN` is unset.
- Body (Zod `createCheckoutBodySchema`, `src/lib/payments/validation.ts`):

```ts
{
  account_id: string;            // uuid, must belong to the user
  category_id?: string | null;   // uuid, must belong to the user
  amount_cents: number;          // positive integer
  currency_code: "ARS" | "USD";  // service currently rejects anything but "ARS"
  description: string;           // 1–256 chars
  transaction_date: string;      // YYYY-MM-DD
  recurring_expense_id?: string | null;
  occurrence_date?: string | null;      // YYYY-MM-DD
  transaction_client_id?: string;       // uuid, deterministic if omitted (see payment-service.ts)
  original_amount_cents?: number;
  exchange_rate?: number | null;
  converted_amount_cents?: number | null;
  exchange_rate_source?: "bna" | "manual" | null;
}
```

- **200**: `{ attempt_id, checkout_url, preference_id, status }`
- **400**: validation error or non-ARS currency
- **502**: Mercado Pago API error

### `GET /api/payments/status`

Lists the current user's recent payment attempts.

- **401** if no session.
- **200** (not configured): `{ configured: false, attempts: [] }`
- **200**: `{ configured: true, attempts: PaymentAttempt[] }` — each with `id`, `status`,
  `amount_cents`, `currency_code`, `description`, `created_at`, `updated_at`, `error_message`.

### `GET /api/payments/[id]/status`

Single attempt, scoped to the current user. Optional `?payment_id=` triggers reconciliation against
the provider (useful when a webhook hasn't arrived yet after a return redirect).

- **200**: full attempt row (includes `transaction_client_id`, `provider_payment_id`)
- **404**: not found for this user. **502**: reconciliation call to Mercado Pago failed.

### `POST /api/payments/mercadopago/webhook` (also `GET` for health check)

Public route — Mercado Pago cannot send a Supabase session. Authenticated instead via HMAC
signature (`x-signature` header, verified in `PaymentAdapter.verifyWebhookSignature`, using
`MERCADOPAGO_WEBHOOK_SECRET`). Idempotent by `(provider, provider_event_key)` — see
[`domain.md`](domain.md#payment-settlement-guarantees).

- `GET`: `{ ok: true }` (health probe).
- `POST` **200**: `{ received: true, duplicate?: boolean }` — always 200 for recognized-but-benign
  cases (unprocessable topics, missing ids) to avoid Mercado Pago retry storms. Real processing
  errors are logged and recorded on `payment_webhook_events.processing_status`, not surfaced via the
  HTTP status.
- **401** `{ error: "Unauthorized" }` if the signature doesn't verify.
