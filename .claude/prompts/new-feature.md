# Prompt: New feature

Use for adding new user-facing functionality.

```
Feature: <what the user should be able to do>
Motivation: <why — link to ROADMAP.md/TODO.md item if it's tracked there>

Before implementing:
1. Read `CLAUDE.md` (constraints section) and `.claude/context/pre-edit-checklist.md`.
2. Read `docs/domain.md` for existing vocabulary — reuse existing entities/terms, don't invent a
   parallel concept for something that already exists.
3. If this touches the schema, money/currency, or sync behavior, or spans multiple `src/lib/`
   modules: write a spec in `specs/` first (see `specs/README.md` for the format) and confirm the
   approach before writing code.
4. Check `docs/conventions.md` for the patterns to follow (money as cents, client_id sync,
   Spanish UI / English code, Zod validation on API routes, etc.).

Implementation:
- Follow the existing folder structure (`ARCHITECTURE.md`) — business logic in `src/lib/`, one hook
  per domain aggregate in `src/hooks/`, thin API routes.
- New DB changes go in a new `supabase/migrations/*.sql` file — never edit a past migration.
- New tables need RLS enabled + a policy (or explicit deny + service-role access if confidential).

After implementing:
- Update `docs/domain.md` (business rules/terms), `docs/database.md` (if schema changed),
  `docs/api.md` (if a route changed), and any other affected topic doc.
- Fold the spec's lasting facts into the real docs; leave the spec file as a historical record.
- Add a line under "Unreleased" in `CHANGELOG.md`. Update `ROADMAP.md`/`TODO.md` if this closes an
  item there.
```
