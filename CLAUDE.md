@AGENTS.md

# Klaro — Claude Code project memory

This file is the entry point for AI coding agents working in this repo. Keep it short; put depth in
`docs/`. Prefer reading a linked topic file over re-deriving facts from source.

## Project purpose

**Klaro** is an offline-first personal finance web app (PWA) for individuals — not analysts. It
tracks income, expenses, transfers, investments, and recurring expenses across ARS/USD accounts,
with a budget and dashboard. It's a solo-developer, real (non-demo) project currently in active
development, in Spanish (UI copy, route slugs, commit messages).

## Stack (see [`ARCHITECTURE.md`](ARCHITECTURE.md) for details)

Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind v4 + Supabase (Postgres/Auth/RLS)
+ Dexie (IndexedDB) for offline + Zod + Mercado Pago (payments) + Google Calendar API. No test
framework, no CI, no ORM, no global state library.

## Architecture summary

Every write lands in IndexedDB first; a sync engine pushes/pulls against Supabase asynchronously
(offline-first, `client_id`-idempotent upserts, last-write-wins). Most CRUD talks to Supabase
directly from client hooks (RLS-scoped by the anon key) — there is **no general REST API**.
`src/app/api/*` route handlers exist only for server-only secrets (Google OAuth tokens, Mercado
Pago) and webhooks. Full detail: [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Folder structure

```
src/app/            Routes: login/, registro/ (public), (app)/ (authenticated shell), api/ (route handlers)
src/components/      ui/, layout/, transactions/, accounts/, budget/, categories/, charts/,
                     dashboard/, payments/, google-calendar/, recurring/, providers/, pwa/
src/lib/             supabase/, db/ (Dexie), sync/, data/ (Supabase CRUD), finance/ (business logic),
                     recurrence/, payments/, google-calendar/, categories/
src/hooks/           One hook per domain aggregate (use-transactions, use-accounts, ...)
src/types/           database.ts (core domain types), budget.ts, recurrence.ts
src/constants/       routes.ts, accounts.ts, category-icons.ts
supabase/migrations/ Versioned SQL, applied in filename (timestamp) order — see docs/database.md
docs/                Topic docs — read before asking "how does X work"
docs/adr/            Why decisions were made (context/consequences)
specs/               Feature specs for larger changes (create one before big features)
.claude/context/     Condensed reference files to save tokens (routes, schema, env at a glance)
.claude/prompts/     Reusable prompt templates for common task types
```

## Docs index

| Topic | File |
|---|---|
| Architecture, folder structure, diagrams | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Why decisions were made | [`DECISIONS.md`](DECISIONS.md), [`docs/adr/`](docs/adr/) |
| API routes (methods, auth, request/response) | [`docs/api.md`](docs/api.md) |
| Auth flow, session handling, route protection | [`docs/auth.md`](docs/auth.md) |
| Database schema, RLS, relations | [`docs/database.md`](docs/database.md) |
| Environment variables | [`docs/environment.md`](docs/environment.md) |
| Deployment process | [`docs/deploy.md`](docs/deploy.md) |
| Testing (current state + how to add tests) | [`docs/testing.md`](docs/testing.md) |
| Coding conventions | [`docs/conventions.md`](docs/conventions.md) |
| Business terminology & rules | [`docs/domain.md`](docs/domain.md) |
| npm scripts & one-off scripts | [`docs/scripts.md`](docs/scripts.md) |
| Roadmap / pending work | [`ROADMAP.md`](ROADMAP.md), [`TODO.md`](TODO.md) |
| Known gaps and sharp edges | [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) |
| Change history | [`CHANGELOG.md`](CHANGELOG.md) |

## Coding conventions (summary — full detail in [`docs/conventions.md`](docs/conventions.md))

- TypeScript `strict`; import shared code via the `@/*` alias (`@/lib/...`, not relative `../../..`).
- **Money is always integer cents** (`amount_cents`, `bigint` in SQL / `number` in TS). Never use
  floats for money. Format for display with `src/lib/format.ts`.
- Currency codes are `"ARS" | "USD"` only (`CurrencyCode` in `src/types/database.ts`). Never sum
  amounts across currencies — always compute/display per-currency.
- Every syncable row has a client-generated UUID `client_id`; upsert on
  `(user_id, client_id)`, never assume `id` is stable across offline/online transitions.
- Route slugs and UI copy are in **Spanish**; code identifiers (variables, types, files) are in
  **English**. Don't translate one into the other.
- No `tailwind.config.*` — Tailwind v4 is configured via CSS in `src/app/globals.css`. Don't
  recreate a JS/TS Tailwind config.
- No classic `middleware.ts` — session refresh and route guarding live in `src/proxy.ts` (Next.js 16
  convention; see `AGENTS.md`).

## Business rules (summary — full detail in [`docs/domain.md`](docs/domain.md))

- Savings traffic light: ≥20% savings rate = green, 10–19% = yellow, <10% = red
  (`savingsTrafficLight` in `src/lib/finance/calculations.ts`).
- Budget usage traffic light: <80% of limit = green, 80–100% = yellow, >100% = red
  (`budgetTrafficLight`, same file).
- Budget limits can be fixed cents or a percentage of monthly income, per category and per
  subcategory (`src/types/budget.ts`).
- Transfers are one `transactions` row with `type = "transfer"` and both `account_id` (source) and
  `to_account_id` (destination) — never two linked rows.
- FX conversion rate is always expressed as **ARS per 1 USD** (`src/lib/finance/currency.ts`).

## Workflow before editing

1. Check [`docs/domain.md`](docs/domain.md) and [`docs/database.md`](docs/database.md) if the change
   touches money, currency, or a table — get the vocabulary and constraints right first.
2. Check [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) — you may be about to "fix" a documented limitation
   that's a deliberate simplification, or hit one that will bite your change.
3. For anything touching the DB schema: add a new file under `supabase/migrations/` (never edit a
   past migration) and update [`docs/database.md`](docs/database.md) in the same change.
4. For a non-trivial feature: write or update a spec under `specs/` before implementing (see
   `specs/README.md`).
5. After implementing: update the relevant `docs/*.md`, add a line to `CHANGELOG.md` under
   "Unreleased", and check off / remove the matching item in `TODO.md` if there was one.
6. Read the relevant guide under `node_modules/next/dist/docs/` before writing App Router code you
   are not 100% sure about — this Next.js major has breaking changes vs. older training data.

## Constraints — must never change without an explicit decision

- **Money representation**: integer cents everywhere. Do not introduce floats for amounts.
- **`client_id` idempotency contract**: every sync-relevant table keeps `UNIQUE (user_id, client_id)`
  and upserts on that key. Do not switch to `id`-only upserts.
- **RLS on every user-owned table**: never add a table with user data without `ENABLE ROW LEVEL
  SECURITY` and a policy scoped to `auth.uid() = user_id`.
- **Service-role key stays server-only**: never import `src/lib/supabase/admin.ts` from a Client
  Component or any code bundled to the browser.
- **`user_google_integrations` and `payment_webhook_events` stay client-inaccessible**: no RLS policy
  granting `anon`/`authenticated` access — service role only, scoped by `user_id` in application
  code.
- **Currencies stay `ARS`/`USD` only** unless a migration explicitly widens `CurrencyCode` and every
  currency-aware calculation in `src/lib/finance/`.
- **Don't remove the legacy route redirects** in `next.config.ts` (`/gastos`, `/ingresos`, etc.)
  without confirming no external links depend on them.

## Testing / build commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # ESLint (flat config, next/core-web-vitals + next/typescript)
npm run build    # Next.js production build (also type-checks)
npm run start    # Run the production build
```

There is no `npm test` — no automated test suite exists yet. See
[`docs/testing.md`](docs/testing.md) before adding one.

## Token-saving tips for this repo

- Check `.claude/context/` first for a condensed answer (routes, schema, env vars) before grepping
  the whole `src/` tree.
- Prefer reading one topic file in `docs/` over multiple source files when you just need "how does X
  work" — the docs cite exact file paths for when you do need the source.
- Business logic is concentrated in `src/lib/finance/` (pure functions, no I/O) — read there first
  for money/budget/currency questions instead of scanning components.
