# Prompt: Refactor

Use for restructuring code without changing behavior.

```
Refactor target: <files/modules/pattern to change>
Goal: <why — readability, duplication, testability, etc.>
Explicitly NOT changing: <behavior/API/schema that must stay identical>

Before refactoring:
1. Confirm current behavior first (read the code + `docs/` for the area — don't refactor from a
   misunderstanding of what it currently does).
2. Check `CLAUDE.md` constraints — some patterns (money as cents, client_id idempotency, RLS,
   service-role isolation) are load-bearing, not just style; don't "clean them up" away.
3. If there's no automated test covering this code (likely — see `docs/testing.md`), do a manual
   before/after comparison of behavior, or add a quick test first if the code is pure logic
   (`src/lib/finance/`, `src/lib/recurrence/` are the easiest to test in isolation).

During refactor:
- Prefer small, reviewable steps over one large rewrite.
- Keep public function signatures and API route request/response shapes stable unless the task
  explicitly includes changing them.
- Don't rename Spanish UI copy/routes to English, or vice versa for code identifiers — see
  `docs/conventions.md`.

After refactoring:
- Update `docs/conventions.md` or other topic docs if the refactor changes a pattern documented
  there (e.g. moves logic between layers).
- Add a line under "Unreleased" in `CHANGELOG.md` if the refactor is significant enough to matter to
  future readers of the history.
```
