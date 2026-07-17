# Specs

This folder holds design specs for non-trivial features, written **before** implementation. Small
fixes and obvious changes don't need one — use judgment. Write one when a change touches the data
model, sync behavior, money/currency handling, or spans multiple modules.

## When to write a spec

- New database table or non-additive schema change.
- Anything touching money, currency conversion, or sync/offline behavior.
- A feature that spans more than ~3 files or multiple `src/lib/` modules.
- Anything you'd otherwise need to ask the project owner multiple clarifying questions about.

## Format

Keep it short — a spec is a thinking tool, not documentation to maintain forever. Suggested shape:

```markdown
# <Feature name>

## Problem
What's missing / broken, for whom.

## Scope
What this change does and explicitly does NOT do.

## Data model
New/changed tables, columns, types. Note migration filename once created.

## Business rules
Calculations, validations, edge cases — the stuff that belongs in docs/domain.md once shipped.

## Open questions
Anything genuinely undecided.
```

## Lifecycle

1. Write the spec here as `NNN-short-name.md` (numbered for ordering, e.g. `001-csv-export.md`).
2. Implement against it; update the spec if reality diverges during implementation.
3. Once shipped, fold the lasting facts into the real docs (`docs/domain.md`, `docs/database.md`,
   `ARCHITECTURE.md`) and add a line to `CHANGELOG.md`. Leave the spec file in place as a historical
   record — don't delete it, but don't treat it as current truth once superseded by `docs/`.

No specs exist yet — this folder is currently just the convention above, ready for the first one.
