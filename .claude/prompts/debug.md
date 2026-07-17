# Prompt: Debug (unclear root cause)

Use when something is broken but the cause isn't obvious yet — more exploratory than
`bug-fix.md`.

```
Symptom: <what's observed — error message, wrong value, wrong UI state>
Context: <when it happens — always? specific data? offline vs online? specific currency/account?>

Investigation order:
1. Is this sync/offline-related? Check `docs/auth.md`... no — check `ARCHITECTURE.md`'s sync flow
   diagram and `src/lib/sync/sync-engine.ts` / `src/lib/db/local-db.ts`. Common culprits: stale
   local row not reconciled, `client_id` mismatch, LWW picked the wrong side.
2. Is this money/currency-related? Check `docs/domain.md` (Currency & FX) and
   `src/lib/finance/currency.ts` / `calculations.ts`. Common culprits: mixing ARS/USD in a sum,
   treating `original_amount_cents` vs `amount_cents` inconsistently.
3. Is this an API route? Reproduce the exact request (`docs/api.md` for the contract), check auth
   (`401`?), check Zod validation (`400`?), then check the underlying `src/lib/` call.
4. Is this a Postgres RLS issue (data not showing up / write silently failing)? Check
   `docs/database.md`'s RLS section — a missing `user_id` match is the usual cause, and Supabase
   RLS failures often look like "empty result" rather than an error.
5. Check `KNOWN_ISSUES.md` — this may be a known, already-diagnosed limitation.

Before concluding: state the root cause as a single falsifiable sentence ("X happens because Y"),
and confirm it explains every observed detail of the symptom, not just the general shape of it.
Only then propose a fix (or hand off to `bug-fix.md` for the actual fix).
```
