# Decisions log

Short-form log of notable technical decisions, newest first. Each entry that changed the shape of
the system also has a detailed record in [`docs/adr/`](docs/adr/). Use this file for a fast scan;
use the ADR for full context/rationale/alternatives.

| Date | Decision | ADR |
|---|---|---|
| 2026-07-11 | Mercado Pago Checkout Pro (hosted redirect) for payments, adapter pattern for future providers | [0006](docs/adr/0006-mercadopago-checkout-pro.md) |
| 2026-07-10 | Multi-currency (ARS/USD) support: store original + converted cents + rate on each transaction, never mix currencies in a sum | [0005](docs/adr/0005-multi-currency-ars-usd.md) |
| 2026-06-24 | Google Calendar OAuth tokens stored server-side only, accessed exclusively via the service-role admin client | [0004](docs/adr/0004-google-oauth-service-role-only.md) |
| 2026-06-23 | Hardened DB functions (`search_path`, revoked implicit `EXECUTE`) after Supabase security advisor findings | [0004](docs/adr/0004-google-oauth-service-role-only.md) |
| 2026-06-21 | Recurring expenses modeled as an RRULE subset (JSONB `recurrence_rule`) with deterministic UUIDv5 `client_id` per occurrence | [0007](docs/adr/0007-recurring-expenses-rrule-subset.md) |
| 2026-06-20 | Transfers are a single `transactions` row with `to_account_id`, not two linked rows | [0007](docs/adr/0007-recurring-expenses-rrule-subset.md) |
| 2026-06-20 | Removed the classic `middleware.ts` in favor of `src/proxy.ts` (Next.js 16 convention) | — (see `AGENTS.md`) |
| 2026-06-02 | Offline-first architecture: Dexie (IndexedDB) as the local source of truth, Supabase as the sync target | [0001](docs/adr/0001-offline-first-dexie-supabase.md) |
| 2026-06-02 | Money stored as integer cents (`bigint`), never floats | [0002](docs/adr/0002-money-as-integer-cents.md) |
| 2026-06-02 | Sync idempotency via client-generated `client_id` UUID + `UNIQUE (user_id, client_id)` + upsert | [0003](docs/adr/0003-client-id-sync-idempotency.md) |
| 2026-06-02 | Supabase (Postgres + Auth + RLS) as the only backend; no custom API server | [0001](docs/adr/0001-offline-first-dexie-supabase.md) |

## Superseded / reversed decisions

- **Spanish route names as legacy top-level routes** (`/gastos`, `/ingresos`, `/gastos-recurrentes`,
  `/categorias`) were replaced by a unified `/transacciones` flow. The old paths still exist as
  `next.config.ts` redirects for bookmarked links — do not build new features on them.
- **`.env.example` was deleted** in commit `e075deb` ("no longer needed"). This repo reintroduces it
  because a checked-in example file with placeholder values is standard practice and costs nothing;
  see [`.env.example`](.env.example) and [`docs/environment.md`](docs/environment.md).

## How to add a decision

1. Add a one-line row to the table above.
2. If the decision has real trade-offs worth remembering, add `docs/adr/NNNN-title.md` using the
   existing files as a template (Context / Decision / Consequences).
