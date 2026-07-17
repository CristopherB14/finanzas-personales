# Testing

## Current state: no automated tests

There is no test framework installed (no Jest/Vitest/Playwright in `package.json`), no `*.test.*` /
`*.spec.*` files, and no `test` script. `npm run build` (which type-checks via `tsc` as part of the
Next.js build) and `npm run lint` are the only automated checks today. There is also no CI —
`.github/workflows/` does not exist.

This is tracked in [`TODO.md`](../TODO.md); don't assume tests exist elsewhere just because a
mature-looking codebase usually has them.

## Manual testing checklist (until automated tests exist)

Run through this after any change touching money, sync, or auth:

1. **Auth**: sign up a fresh user → confirm default categories are seeded (`ensureUserSetup`) and
   the dashboard renders with zero data instead of erroring.
2. **Offline write**: disable network (DevTools → Network → Offline), create a transaction, confirm
   it shows immediately with a pending-sync indicator, re-enable network, confirm it syncs and the
   pending indicator clears.
3. **Currency conversion**: create a USD transaction against an ARS account (or vice versa), confirm
   the exchange-rate prompt appears and the converted amount matches `rate × amount` (see
   `src/lib/finance/currency.ts`).
4. **Transfers**: transfer between two accounts of different currencies, confirm both account
   balances update correctly and only one `transactions` row is created.
5. **Budget thresholds**: set a category budget, spend into the 80–100% and >100% bands, confirm the
   traffic light changes (`budgetTrafficLight` in `src/lib/finance/calculations.ts`).
6. **Recurring expense**: create one due today with `auto_create: true`, confirm a transaction is
   generated and `next_due_date` advances.
7. **Payments** (if Mercado Pago is configured): run a sandbox checkout end-to-end, confirm exactly
   one ledger transaction is created after settlement, and re-sending the same webhook payload
   doesn't create a duplicate.

## If you're adding the first tests

Recommended order, cheapest/highest-value first:

1. **`src/lib/finance/`** — pure functions, no I/O, no mocking needed:
   `calculations.ts` (traffic lights, budget math, dashboard aggregation),
   `currency.ts` (conversion, rounding), `transfers.ts`, `cash-flow.ts`.
2. **`src/lib/recurrence/engine.ts`** — pure RRULE-subset date math, easy to test with fixed dates.
3. **`src/lib/db/local-db.ts`** merge/dedupe logic (`mergeRemoteTransactions`,
   `dedupeLocalTransactionsByClientId`) — needs a fake/in-memory Dexie or a browser-like test
   environment (jsdom + `indexedDB` polyfill, e.g. `fake-indexeddb`).
4. **API route handlers** (`src/app/api/**/route.ts`) — need a mocked Supabase client; consider
   `vitest` + manual mocks over pulling in a full Supabase test harness for these.

Suggested stack given the rest of this project: **Vitest** (fast, works well with Next.js/TS,
no config file needed for a basic setup) for units, **Playwright** later for auth + offline-sync
E2E flows (it can simulate offline mode natively via `page.context().setOffline(true)`).

## Commands (current)

```bash
npm run lint    # ESLint — next/core-web-vitals + next/typescript rules
npm run build   # Next.js production build; fails on TypeScript errors
```

There is no `npm run typecheck` separate from `build` — add one (`tsc --noEmit`) if you want a
faster feedback loop without a full build.
