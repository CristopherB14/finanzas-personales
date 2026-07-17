# Database

Postgres via Supabase. Schema is defined entirely by the SQL files in `supabase/migrations/`,
applied in filename (timestamp) order — there is no ORM and no schema file to read instead of the
migrations. This doc is a human-readable summary; **the migrations are the source of truth.**

## Conventions

- Primary keys: `UUID DEFAULT gen_random_uuid()` (via `pgcrypto`).
- Every user-owned table has `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`.
- Sync-relevant tables have a client-generated `client_id UUID` with `UNIQUE (user_id, client_id)` —
  this is the idempotency key used by upserts from the client (see [`api.md`](api.md) is not
  relevant here; see `src/lib/sync/sync-engine.ts`).
- Money is `BIGINT` **cents**, never floating point.
- Currency is `TEXT currency_code`, constrained to `('ARS', 'USD')` since the multi-currency
  migration.
- `created_at` / `updated_at TIMESTAMPTZ`, kept current by the shared `set_updated_at()` trigger
  function.
- Row Level Security is enabled on every table; policies key off `auth.uid() = user_id` (directly or
  transitively).

## Entity relationship diagram

```mermaid
erDiagram
    profiles ||--o{ accounts : owns
    profiles ||--o{ categories : owns
    profiles ||--o{ transactions : owns
    profiles ||--o{ recurring_expenses : owns
    profiles ||--o{ investment_assets : owns
    profiles ||--o{ payment_attempts : owns
    profiles ||--|| user_google_integrations : "has (server-only)"
    accounts ||--o{ transactions : "source of"
    accounts ||--o{ transactions : "destination of (transfers)"
    categories ||--o{ transactions : classifies
    categories ||--o{ categories : "parent of (subcategories)"
    categories ||--o{ budget_lines : limits
    categories ||--o{ investment_assets : "groups (category + subcategory)"
    recurring_expenses ||--o{ transactions : generates
    recurring_expenses ||--o{ payment_attempts : "paid via"
    investment_assets ||--o{ transactions : "tracked by"
    budgets ||--o{ budget_lines : has
    payment_attempts ||--o{ payment_webhook_events : "settled by"

    profiles {
        uuid id PK "= auth.users.id"
        text display_name
        text default_currency
        jsonb preferences "budget settings live here (see domain.md)"
    }

    accounts {
        uuid id PK
        uuid user_id FK
        text name
        text description
        account_type type "cash, checking, savings, credit_card, investment, other"
        bigint balance_cents
        text currency_code "ARS or USD"
        boolean is_default
        uuid client_id
    }

    categories {
        uuid id PK
        uuid user_id FK
        text name
        category_type type "income, expense, investment"
        uuid parent_id FK "self-reference: subcategory"
        int sort_order
        uuid client_id
    }

    transactions {
        uuid id PK
        uuid user_id FK
        uuid account_id FK "source account"
        uuid to_account_id FK "destination account, transfers only"
        uuid category_id FK
        uuid investment_asset_id FK
        uuid recurring_expense_id FK
        transaction_type type "income, expense, investment, transfer"
        bigint amount_cents "always positive; sign is implied by type"
        text currency_code
        bigint original_amount_cents
        numeric exchange_rate "ARS per 1 USD"
        bigint converted_amount_cents
        text exchange_rate_source "bna or manual"
        date transaction_date
        text description
        text[] tags
        uuid client_id UK
        text google_event_id
    }

    recurring_expenses {
        uuid id PK
        uuid user_id FK
        uuid client_id UK
        text name
        bigint amount_cents
        uuid category_id FK
        uuid account_id FK
        text currency_code
        date start_date
        date end_date
        recurrence_frequency frequency
        jsonb recurrence_rule "RRULE subset: freq, interval, until"
        date next_due_date
        boolean auto_create
        jsonb sync_metadata "Google Calendar event linkage"
    }

    investment_assets {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        uuid subcategory_id FK UK "one asset per subcategory"
        bigint invested_cents
        bigint market_value_cents "nullable; no auto pricing feed"
        text currency_code
    }

    budgets {
        uuid id PK
        uuid user_id FK
        budget_period period_type "monthly or yearly"
        int year
        int month "nullable for yearly"
    }

    budget_lines {
        uuid id PK
        uuid budget_id FK
        uuid category_id FK
        bigint limit_cents
    }

    payment_attempts {
        uuid id PK
        uuid user_id FK
        text provider "mercadopago"
        payment_attempt_status status
        bigint amount_cents
        text currency_code
        uuid account_id FK
        uuid category_id FK
        uuid recurring_expense_id FK
        uuid transaction_client_id UK "ledger row created on settlement"
        text external_reference UK
        text provider_payment_id UK
        text checkout_url
    }

    payment_webhook_events {
        uuid id PK
        text provider
        text provider_event_key UK
        text topic
        text action
        payment_webhook_status processing_status
        uuid payment_attempt_id FK
    }

    user_google_integrations {
        uuid user_id PK "server-only, no client RLS policy"
        text access_token
        text refresh_token
        bigint expiry_date
        text calendar_id
    }
```

## Tables

### `profiles`

Extends `auth.users`. Auto-created by the `handle_new_user()` trigger on signup, reading
`display_name`/`default_currency` from `raw_user_meta_data`. `preferences JSONB` currently stores
budget configuration under the `"budget"` key (see [`domain.md`](domain.md#budget)).

### `accounts`

Cash/bank/investment accounts. `type`: `cash | checking | savings | credit_card | investment |
other`. `currency_code` restricted to `ARS`/`USD`. `balance_cents` exists as a column but the app
computes displayed balances **from transactions** (`src/lib/data/accounts.ts`), not by trusting this
column directly — treat it as informational/legacy rather than authoritative.

### `categories`

Income/expense/investment categories, with one level of subcategory via self-referencing
`parent_id`. `type`: `income | expense | investment` (the `investment` value was added later via
`ALTER TYPE ... ADD VALUE`).

### `transactions`

The core ledger. `type`: `income | expense | investment | transfer`.

- `amount_cents` is always **positive**; the sign/effect is implied by `type`, not stored explicitly.
- Transfers are a **single row**: `account_id` is the source, `to_account_id` the destination
  (`transfer_requires_to_account` CHECK constraint enforces both are set together and differ).
- Multi-currency fields (`original_amount_cents`, `exchange_rate`, `converted_amount_cents`,
  `exchange_rate_source`) were added in the multi-currency migration; older rows got
  `original_amount_cents = amount_cents` backfilled. See [`domain.md`](domain.md#currency--fx) for
  the semantics.
- `client_id` is the sync idempotency key: `UNIQUE (user_id, client_id)`, upserted by
  `src/lib/sync/sync-engine.ts` with `onConflict: "user_id,client_id"`.
- `investment_asset_id`, `recurring_expense_id`, `google_event_id` link to the respective features.

### `budgets` + `budget_lines`

Present in the schema (`period_type`, `year`, `month`, `limit_cents` per category) but **the app
does not currently read/write these tables** — actual budget configuration lives in
`profiles.preferences.budget` (see [`domain.md`](domain.md#budget) and `src/lib/data/budgets.ts`).
Treat `budgets`/`budget_lines` as legacy/unused unless you're the one wiring them back up.

### `recurring_expenses`

Templates for recurring spend (rent, subscriptions). `recurrence_rule JSONB` is an RRULE subset
(`freq`, `interval`, optional `until`) — see [`domain.md`](domain.md#recurring-expenses) and
`src/lib/recurrence/engine.ts`. `sync_metadata JSONB` tracks the linked Google Calendar event.
Generated transactions reference the template via `transactions.recurring_expense_id`.

### `investment_assets`

One row per subcategory per user (`UNIQUE (user_id, subcategory_id)`) — the app models "an
investment" as a subcategory (e.g. "Acciones > AAPL"), not a separate free-form asset entity.
`invested_cents` accumulates from `investment`-type transactions; `market_value_cents` is nullable
and has no automatic pricing (see [`KNOWN_ISSUES.md`](../KNOWN_ISSUES.md)).

### `payment_attempts` + `payment_webhook_events`

Mercado Pago checkout tracking. See [`api.md`](api.md#payments-mercado-pago) for the API surface and
[`domain.md`](domain.md#payment-settlement-guarantees) for the idempotency guarantees encoded in the
unique constraints. `payment_webhook_events` stores raw provider payloads for auditing/replay and is
**fully inaccessible to `anon`/`authenticated`** (service role only).

### `user_google_integrations`

OAuth tokens for Google Calendar. RLS enabled with **no** policy (default-deny) plus an explicit
`REVOKE ALL FROM anon, authenticated` — see [`auth.md`](auth.md#google-calendar-oauth-separate-optional).

## Indexes

Key indexes (see migrations for the full list):

```sql
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_user_client ON transactions(user_id, client_id);
CREATE INDEX idx_transactions_recurring ON transactions(recurring_expense_id) WHERE recurring_expense_id IS NOT NULL;
CREATE INDEX idx_recurring_expenses_user_next ON recurring_expenses(user_id, next_due_date) WHERE is_active = true;
CREATE INDEX idx_payment_attempts_user_created ON payment_attempts(user_id, created_at DESC);
```

## RLS pattern

Standard per-table policy:

```sql
CREATE POLICY <table>_all ON <table> FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

Child tables without their own `user_id` (e.g. `budget_lines`) check ownership through their parent
via `EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND b.user_id = auth.uid())`.

Two tables intentionally break this pattern by design (confidential, backend-only data):
`user_google_integrations` and `payment_webhook_events` have RLS enabled with no client policy at
all, so the anon/authenticated roles get zero rows even though RLS is technically "on" — access is
only possible through the service-role client.

## Function hardening

`supabase/migrations/20250623000000_harden_functions.sql` responds to Supabase security-advisor
findings: pins `search_path = ''` on `set_updated_at()` (it touches no tables, so an empty path is
safe) and revokes the implicit `EXECUTE` grant on trigger functions from `anon`/`authenticated` so
they can't be invoked directly via the PostgREST RPC endpoint.

## Conflict resolution

Sync conflicts are resolved by comparing `updated_at` (last-write-wins) in
`mergeRemoteTransactions` (`src/lib/db/local-db.ts`). There is **no** `sync_conflicts` table and no
manual-review UI — earlier docs describing one were aspirational and have been removed. See
[`KNOWN_ISSUES.md`](../KNOWN_ISSUES.md).

## Making schema changes

1. Add a new file to `supabase/migrations/` named `YYYYMMDDHHMMSS_description.sql`. Never edit a
   past migration that may already be applied to a real database.
2. Apply it (Supabase SQL Editor, or `supabase db push` if using the CLI) — see
   [`deploy.md`](deploy.md).
3. Update this file and, if it affects app-level types, `src/types/database.ts`.
4. If it changes anything client-facing, check whether `src/lib/db/local-db.ts` (Dexie schema) needs
   a matching `version()` bump.
