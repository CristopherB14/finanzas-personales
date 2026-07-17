# TODO

Concrete, actionable pending work. For larger strategic gaps see [`ROADMAP.md`](ROADMAP.md); for
bugs/risks in existing code see [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md).

## Product

- [ ] CSV export of transactions (original MVP scope item, never implemented).
- [ ] Investment market pricing — `investment_assets.market_value_cents` exists but nothing
      populates it; currently always equals invested cents unless manually edited.
- [ ] Manual sync-conflict resolution UI (currently silent last-write-wins).
- [ ] Debts module (cards, loans, payoff strategy) — no schema yet.
- [ ] Financial goals module — no schema yet.

## Engineering

- [ ] Add an automated test suite. No test framework is installed (`package.json` has no `test`
      script). Start with pure functions in `src/lib/finance/` (`calculations.ts`, `currency.ts`,
      `transfers.ts`) — see [`docs/testing.md`](docs/testing.md).
- [ ] Add CI (GitHub Actions or similar) running `npm run lint` and `npm run build` on PRs. No
      `.github/workflows/` exists today.
- [ ] Add a `typecheck` script (`tsc --noEmit`) — currently only checked implicitly by `next build`.
- [ ] Re-add explicit handling for `MERCADOPAGO_ENV` in `.env` (production) — as of writing, `.env`
      is missing `MERCADOPAGO_ENV` and `NEXT_PUBLIC_APP_URL` (present in `.env.local` only).
- [ ] Consider a `vercel.json` (or documented dashboard settings) to make deployment config
      reviewable in git instead of implicit.

## Documentation

- [ ] Keep `CHANGELOG.md` updated per change going forward (it was back-filled once from git log on
      2026-07-16 and will drift if not maintained).
- [ ] Fill in real values / links in `docs/deploy.md` once a production URL and CI pipeline exist.

## How to use this file

Add new items as `- [ ]`. Check them off (`- [x]`) and leave them in place for one release cycle,
then move completed larger items into `CHANGELOG.md` and delete the line here.
