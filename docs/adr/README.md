# Architecture Decision Records

Full-context records for decisions that shaped the system. For a quick chronological scan, see
[`../../DECISIONS.md`](../../DECISIONS.md).

| # | Title |
|---|---|
| [0001](0001-offline-first-dexie-supabase.md) | Offline-first with Dexie + Supabase |
| [0002](0002-money-as-integer-cents.md) | Money as integer cents |
| [0003](0003-client-id-sync-idempotency.md) | Client-generated `client_id` for sync idempotency |
| [0004](0004-google-oauth-service-role-only.md) | Google OAuth tokens: service-role only, no client RLS policy |
| [0005](0005-multi-currency-ars-usd.md) | Multi-currency (ARS/USD) without mixing |
| [0006](0006-mercadopago-checkout-pro.md) | Mercado Pago Checkout Pro for payments |
| [0007](0007-recurring-expenses-rrule-subset.md) | Recurring expenses as an RRULE subset + single-row transfers |

## Format

Each ADR is: **Context** (what problem existed) → **Decision** (what was chosen) →
**Consequences** (trade-offs, what this rules out). Keep them short — a page, not an essay. Add a
new one when a decision has real trade-offs worth remembering; for small/obvious choices, a line in
`DECISIONS.md` is enough.
