# Prompt: Bug fix

Use for a reported bug with a known symptom.

```
Bug: <one-line description of the wrong behavior>
Where observed: <route/page/API endpoint>
Expected: <what should happen>
Actual: <what happens instead>
Repro steps: <how to trigger it>

Before changing code:
1. Read `.claude/context/pre-edit-checklist.md`.
2. Find the relevant code path (check `.claude/context/quick-reference.md` for key file pointers
   before grepping broadly).
3. Check `KNOWN_ISSUES.md` — confirm this isn't a documented, deliberate simplification rather than
   a bug.
4. Identify root cause, not just the symptom. State it in one sentence before writing a fix.

Fix constraints:
- Don't change unrelated code. Don't reformat files you're not otherwise editing.
- If the fix touches money/currency, sync, or the DB schema, follow the relevant rules in
  `docs/domain.md` / `docs/database.md` exactly — don't improvise a new convention.
- Add/update a manual test step in `docs/testing.md`'s checklist if this class of bug isn't covered
  there yet.

After fixing:
- Add a line under "Unreleased" in `CHANGELOG.md`.
- If this was tracked in `TODO.md` or `KNOWN_ISSUES.md`, remove/update that entry.
```
