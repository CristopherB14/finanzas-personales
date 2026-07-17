# Pre-edit checklist

Run through before making a change, to avoid re-discovering constraints mid-task.

1. **Touching money/currency?** → read `docs/domain.md` (Currency & FX section) +
   `.claude/context/business-rules.md`. Never introduce floats; never sum ARS + USD.
2. **Touching a table or adding one?** → read `docs/database.md`. New tables need
   `ENABLE ROW LEVEL SECURITY` + a policy (or explicit no-policy + `REVOKE ALL` if it's
   confidential like OAuth tokens). New migration file, never edit a past one.
3. **Touching transactions/accounts/categories/budgets/recurring-expenses?** → this is client-side
   Supabase + Dexie, not a REST API. Look in `src/hooks/` first.
4. **Touching an API route under `src/app/api/`?** → check `docs/api.md` for the existing
   contract before changing request/response shape (client code depends on it).
5. **Touching auth or route protection?** → read `docs/auth.md`. There is no `middleware.ts`
   (`src/proxy.ts` instead).
6. **About to "fix" something that looks wrong?** → check `KNOWN_ISSUES.md` first; it might be a
   documented, deliberate simplification.
7. **Non-trivial feature (new table, multi-file, sync/money-related)?** → write a spec in `specs/`
   first.
8. **Finishing up?** → update the relevant `docs/*.md`, add a line under "Unreleased" in
   `CHANGELOG.md`, remove/check the matching `TODO.md` item if any.
