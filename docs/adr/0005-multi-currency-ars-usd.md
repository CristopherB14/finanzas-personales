# 0005 — Multi-currency (ARS/USD) without mixing

## Context

Argentine users commonly hold both ARS and USD (a widely used savings/hedging currency locally).
The app needed to support entering a transaction in one currency against an account in another
(e.g. paying an ARS expense from a USD account) without corrupting reports by silently converting
everything into one currency at a possibly-stale rate.

## Decision

Restrict `CurrencyCode` to `"ARS" | "USD"` (a closed union, enforced by a DB `CHECK` constraint too).
Every transaction stores `original_amount_cents` (what the user entered), `amount_cents` (the actual
debit/credit in the **account's** currency), `exchange_rate` (always ARS per 1 USD), and
`exchange_rate_source` (`"bna"` for a live-looked-up rate, `"manual"` for user-entered). All
reporting/aggregation functions (`src/lib/finance/calculations.ts`) group by currency into
`Record<CurrencyCode, number>` and never add an ARS total to a USD total; the UI picks one "primary"
currency to headline via `pickPrimaryCurrency()`, with the rest available as a breakdown.

## Consequences

- Reports are always currency-correct, but a user with meaningful balances in both currencies only
  sees one currency headlined on the dashboard KPI cards (see
  [`../../KNOWN_ISSUES.md`](../../KNOWN_ISSUES.md)) — full net worth requires reading both.
- Adding a third currency means updating the `CurrencyCode` union, the DB `CHECK` constraints, and
  auditing every function in `src/lib/finance/` that assumes exactly ARS/USD semantics (e.g. the
  "rate is ARS-per-USD" convention doesn't generalize to N currencies without a base-currency
  decision).
- The live FX rate (BNA/dolarapi) is Argentina-specific; a third currency or a non-Argentine
  deployment would need a different rate source.
