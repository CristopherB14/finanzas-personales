# 0007 — Recurring expenses as an RRULE subset, and single-row transfers

## Context

Two related "how do we model this in one row vs. many" decisions made around the same time
(2026-06-20/21):

1. Recurring expenses need a recurrence schedule expressive enough for common cases (monthly rent,
   quarterly insurance, custom intervals) and ideally compatible with calendar systems for the
   Google Calendar integration, without building a full calendar-recurrence engine.
2. Transfers between the user's own accounts needed a data model — either one row per leg (like
   double-entry bookkeeping) or a single row referencing both accounts.

## Decision

**Recurring expenses**: store a JSONB `recurrence_rule` shaped as a subset of RFC 5545 (RRULE):
`{ freq: DAILY|WEEKLY|MONTHLY|YEARLY, interval, until? }`. UI presets (daily/weekly/biweekly/
monthly/quarterly/yearly/custom) map onto this subset (`frequencyToRule()` in
`src/lib/recurrence/engine.ts`) — e.g. "quarterly" is just `MONTHLY` with `interval: 3`. This is
intentionally a subset (no `BYDAY`/`BYMONTHDAY` yet) — enough for personal recurring bills, directly
serializable for Google Calendar's own RRULE strings later.

**Transfers**: a single `transactions` row with `type: "transfer"`, `account_id` as the source and
`to_account_id` as the destination, enforced by a `CHECK` constraint
(`transfer_requires_to_account`) that both are set (and differ) exactly when `type = 'transfer'`.

## Consequences

- Recurring: the subset is easy to reason about and map to UI presets, but anything needing
  `BYDAY`/`BYMONTHDAY` (e.g. "the last Friday of the month") isn't representable yet — would need a
  schema and engine extension, not just a UI change.
- Recurring: deterministic `client_id` per occurrence (UUIDv5 of expense + date) means regenerating
  overdue occurrences is idempotent — see ADR 0003.
- Transfers: balance/reporting code must special-case `type: "transfer"` (it affects two accounts'
  balances from one row) rather than treating every transaction as single-account — see
  `isTransferTransaction()` and `accountBalanceFromTransactions()`. Cross-currency transfers reuse
  the same FX fields as regular transactions (`exchange_rate` is ARS-per-USD regardless of transfer
  direction).
- Neither transfers nor recurring expenses are represented as double-entry ledger rows; there's no
  separate "leg" table. Keep this in mind before adding reporting that assumes one row = one
  account effect.
