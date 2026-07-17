# 0002 — Money as integer cents

## Context

Floating-point arithmetic cannot represent most decimal currency amounts exactly (`0.1 + 0.2 !==
0.3` in IEEE 754), which causes cumulative rounding errors in a ledger that sums many small
transactions over months/years.

## Decision

Every monetary value is stored and computed as an **integer number of cents**: `bigint` in
Postgres (`amount_cents`, `limit_cents`, `invested_cents`, ...), `number` in TypeScript (safe since
JS numbers are exact integers well past any realistic personal-finance amount). Currency conversion
(`convertCents()` in `src/lib/finance/currency.ts`) multiplies/divides then `Math.round()`s back to
an integer — it never leaves cents-space.

## Consequences

- No float-drift bugs in balances, budgets, or FX conversion.
- Every new monetary field must follow the same convention — a `numeric`/`float` money column
  anywhere in the schema would be a bug, not a style choice.
- Display formatting (`src/lib/format.ts`) is responsible for converting cents to a human-readable
  decimal string; that conversion happens only at the presentation boundary, never mid-calculation.
