# Prompt: Code review

Use to review a diff/PR against this repo's conventions.

```
Review scope: <diff, branch, or file list>

Check against, in order:
1. Constraints in `CLAUDE.md` — money as integer cents, `CurrencyCode` never mixed, `client_id`
   idempotency on syncable tables, RLS on every user-owned table, service-role client never
   imported into browser-bundled code, legacy route redirects untouched.
2. `docs/conventions.md` — Spanish UI / English code, `@/*` imports, business logic in `src/lib/`
   not components, Zod validation on new/changed API routes, `cn()` for class composition.
3. `docs/database.md` — new tables/columns follow the existing conventions (UUID PKs, `user_id`,
   `client_id` where relevant, `updated_at` trigger, cents-based bigint money columns).
4. Does the diff touch something documented in `KNOWN_ISSUES.md`? If so, does it fix the issue,
   work around it, or risk making it worse — call this out explicitly.
5. Are the relevant docs updated in the same diff? (`docs/api.md` for route changes,
   `docs/database.md` for schema changes, `CHANGELOG.md` entry, `TODO.md`/`KNOWN_ISSUES.md` if
   applicable.) Flag as a blocking comment if a schema or API change ships without a doc update.
6. Tests: there is no test suite (`docs/testing.md`) — don't ask for tests that don't fit the
   current setup, but do flag if the change would have been meaningfully risky to ship without one
   (money/sync logic especially) and suggest it as a follow-up.

Output format: list findings grouped by file, each as [severity] description + suggested fix.
Severities: blocking (violates a constraint), should-fix (convention/doc gap), nit (style/minor).
```
