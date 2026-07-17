# Coding conventions

## TypeScript

- `strict: true` (`tsconfig.json`). Don't add `any` escape hatches without a comment explaining why.
- Import shared code via the `@/*` path alias (maps to `./src/*`), not deep relative imports
  (`../../../lib/...`).
- Domain types live in `src/types/database.ts` (core entities), `src/types/budget.ts`,
  `src/types/recurrence.ts`. Add new shared types there, not inline in components, if more than one
  file needs them.

## Money & currency — the most important rule in this codebase

- **All amounts are integer cents** (`amount_cents`, `limit_cents`, `invested_cents`, etc.), typed
  `bigint` in Postgres and `number` in TypeScript. Never store or compute money as a float/decimal.
- Convert between currencies with `convertCents()` (`src/lib/finance/currency.ts`) only — it uses
  `Math.round` on integers to avoid float drift. Don't hand-roll `amount * rate`.
- Currency codes are the literal union `"ARS" | "USD"` (`CurrencyCode`). Validate with
  `isCurrencyCode()` / normalize with `normalizeCurrencyCode()` rather than comparing raw strings.
- **Never sum amounts across currencies.** Aggregate into `Record<CurrencyCode, number>` and let the
  UI pick which currency to headline (see `pickPrimaryCurrency` in
  `src/lib/finance/calculations.ts`) — don't add an ARS cents value to a USD cents value.
- Format for display with `src/lib/format.ts` (`formatMoney`, `formatMoneyByCurrency`), not ad-hoc
  `toLocaleString` calls scattered through components.

## Sync & offline patterns

- Every syncable entity (currently: `transactions`) carries a client-generated `client_id` (UUID),
  set once at creation and never changed. Upserts always target `(user_id, client_id)`, never bare
  `id` — local rows may have a temporary `local-<uuid>` id before the first successful sync (see
  `remoteTransactionId()` in `src/lib/sync/sync-engine.ts`).
- Write through `src/hooks/use-transactions.ts` (or the equivalent data-layer function), not
  directly to Dexie or Supabase from a component — the hook is what keeps IndexedDB, the sync queue,
  and Supabase consistent.
- If you add a new syncable table, mirror the existing pattern: `client_id UUID`,
  `UNIQUE (user_id, client_id)`, add it to the Dexie schema (`src/lib/db/local-db.ts`, bump the
  `version()`), and extend `sync-engine.ts`'s push/pull — don't invent a parallel sync mechanism.

## Naming: Spanish UI, English code

- Route slugs and user-facing copy are Spanish (`/transacciones`, `/presupuesto`, "Guardar",
  "Ingresá un monto válido").
- Code identifiers — variables, functions, types, file names, comments — are English. Don't
  translate `amount_cents` to `monto_centavos`, and don't write UI strings in English.
- SQL identifiers (table/column names) are English snake_case, matching the TypeScript types.

## File & folder structure

- One hook per domain aggregate in `src/hooks/` (`use-transactions.ts`, `use-accounts.ts`, ...) —
  don't add a generic `use-data.ts` grab-bag.
- Business logic (calculations, validation, currency, recurrence math) belongs in `src/lib/`, with
  no React/Next.js imports, so it stays independently readable and testable. UI components should
  call into `lib/`, not reimplement logic inline.
- Supabase access is layered: `src/lib/supabase/{client,server}.ts` (RLS-scoped, safe for
  client/server components) vs. `src/lib/supabase/admin.ts` (service role, **server-only**, narrowly
  typed to just the tables it needs). Never import `admin.ts` from a Client Component.
- API routes are thin: parse + validate with Zod, call into `src/lib/<domain>/`, map errors to HTTP
  status. Don't put business logic directly in `route.ts` files.

## Styling

- Tailwind CSS v4, configured via CSS (`@import "tailwindcss"` + `@theme inline` in
  `src/app/globals.css`) — there is **no** `tailwind.config.js/ts`. Don't create one; add design
  tokens as CSS custom properties in `globals.css` instead.
- Compose class names with `cn()` (`src/lib/utils.ts`, `clsx` + `tailwind-merge`), not manual string
  concatenation.
- UI primitives (`Button`, `Card`, `Dialog`, `Input`, ...) live in `src/components/ui/` and follow
  the shadcn/Radix pattern (`class-variance-authority` for variants). Reuse these before adding new
  ad-hoc styled elements.

## Validation

- Every API route that accepts a body validates it with a Zod schema
  (`src/lib/payments/validation.ts`, `src/lib/google-calendar/validation.ts`) before touching
  business logic. Follow this pattern for new routes — return `400` on `safeParse` failure with a
  generic message (don't leak Zod's raw error internals to the client).

## Next.js 16 specifics

This project is on a Next.js major that changed conventions you may not expect from training data —
read `node_modules/next/dist/docs/` for anything you're unsure about (per `AGENTS.md`). Two concrete
examples already hit in this codebase:

- No `middleware.ts` — use `src/proxy.ts` (see [`auth.md`](auth.md)).
- `export const runtime = "nodejs"` is set explicitly on API routes that need Node APIs (crypto,
  full `fetch` semantics for outbound calls to Google/Mercado Pago) rather than relying on defaults.

## Linting

`eslint.config.mjs` — flat config, `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
Run `npm run lint` before considering a change done; there is no separate Prettier config, so
formatting follows whatever ESLint enforces plus editor defaults.
