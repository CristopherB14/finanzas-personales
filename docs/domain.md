# Domain glossary & business rules

Business vocabulary and rules, independent of implementation details (those live in
[`database.md`](database.md) and [`api.md`](api.md)). UI copy is Spanish; this doc gives the
Spanish term, the English code term, and the rule.

## Core entities

| Spanish (UI) | Code term | Meaning |
|---|---|---|
| Cuenta | `Account` | A wallet/bank/card/investment holding. Has a `type` (`cash, checking, savings, credit_card, investment, other`) and a `currency_code` (`ARS`/`USD`) |
| Categoría | `Category` | Groups transactions. `type`: `income`, `expense`, or `investment`. May have subcategories |
| Subcategoría | `Category` with `parent_id` set | One level of nesting only |
| Transacción / Movimiento | `Transaction` | A single ledger entry: income, expense, investment, or transfer |
| Transferencia | `Transaction` with `type: "transfer"` | Money moved between two of the user's own accounts |
| Gasto recurrente | `RecurringExpense` | A template that generates expense transactions on a schedule |
| Presupuesto | Budget (see below) | Spending limits per category/subcategory for the current month |
| Inversión | Investment transaction / `InvestmentAsset` | A transaction of type `investment` linked to a subcategory-level holding |
| Patrimonio | Net worth | Cash + investment holdings, computed, not stored |
| Fondo de emergencia | Emergency fund | Currently modeled as available cash, not a separate ring-fenced entity |

## Transactions

- **Amounts are always positive**; whether a transaction increases or decreases a balance is
  determined entirely by `type`, not by sign.
- **`type: "transfer"`** is a single row: `account_id` = source, `to_account_id` = destination.
  Validated by `validateTransferInput()` (`src/lib/finance/transfers.ts`): accounts must differ, the
  source account must have sufficient balance (computed from transaction history, not the `accounts
  .balance_cents` column), and currency conversion (if source/destination currencies differ) must
  resolve to a positive amount.
- **`type: "investment"`** transactions link to a `Category` of type `investment` and, via its
  subcategory, to an `InvestmentAsset` row (one asset per subcategory per user — see
  [`database.md`](database.md#investment_assets)). "Buying more of an existing holding" means
  another `investment` transaction against the same subcategory, not editing the asset directly.

## Currency & FX

- Supported currencies: **ARS** and **USD** only (`CurrencyCode` in `src/types/database.ts`).
- The exchange rate is always expressed as **ARS per 1 USD** — never USD-per-ARS. See
  `parseExchangeRateInput`/`formatExchangeRate` in `src/lib/finance/currency.ts`.
- A transaction's `amount_cents` is always in the **account's** currency (the balance impact); if
  the user entered the amount in a different currency, `original_amount_cents` holds what they
  typed, `converted_amount_cents` holds the converted figure, and `exchange_rate_source` records
  whether the rate came from `"bna"` (live lookup) or `"manual"` (user-entered).
- Rate lookup: `GET /api/exchange-rate/bna` tries dolarapi.com first, falls back to scraping the
  Banco Nación page (`src/lib/finance/bna-rate.ts`). "BNA rate" specifically means the **billetes,
  venta** (cash, sell) rate — the rate a person pays to buy USD cash, which is what an individual
  actually experiences.
- Reports/dashboards **never sum ARS and USD together**. Every aggregate is
  `Record<CurrencyCode, number>`; the UI picks a "primary currency" to headline (ARS if present,
  otherwise whichever currency has data) via `pickPrimaryCurrency()`.

## Budget

- Config lives in `profiles.preferences.budget` (JSONB), **not** the `budgets`/`budget_lines`
  tables (those exist in the schema but are unused — see [`database.md`](database.md#budgets--budget_lines)).
- Shape (`src/types/budget.ts`, `version: 2`): a limit per category and, separately, a limit per
  subcategory. Each limit is either:
  - **`fixed`**: a flat `fixedCents` amount, or
  - **`percentage`**: a `percentage` of that month's income (category limits) or of the parent
    category's resolved limit (subcategory limits).
- Resolution: `resolveCategoryBudgetLimit()` / `resolveSubcategoryBudgetLimit()`
  (`src/lib/finance/calculations.ts`). A category's "spent" total includes its subcategories'
  transactions (`computeCategorySpentCents`).
- **Budget usage traffic light** (`budgetTrafficLight`): `< 80%` green, `80–100%` yellow, `> 100%`
  red. Usage is capped at 150% for display purposes (`budgetUsagePercent`).

## Dashboard metrics

All computed in `src/lib/finance/calculations.ts` from live transaction/account data — nothing is
pre-aggregated or cached server-side.

- **Ahorro del mes (monthly savings)** = income − expense − investment, for the selected month.
- **Tasa de ahorro (savings rate)** = savings / income × 100 (0 if no income).
- **Savings traffic light** (`savingsTrafficLight`): `≥ 20%` green, `10–19%` yellow, `< 10%` red.
- **Patrimonio (net worth)** = cash balance + investment holdings, in the primary currency. Not a
  stored value — recomputed from transactions on every render.
- **Meses de fondo de emergencia (emergency fund months)** = available cash ÷ average of the last 3
  months' expenses. There's no separate "emergency fund" account type; it's just cash on hand today.
- **6-month chart**: income/expense/savings per month for the trailing 6 months, one currency at a
  time (`last6MonthsChart`).

## Recurring expenses

- Frequency presets (`RecurrenceFrequency`): `daily, weekly, biweekly, monthly, quarterly, yearly,
  custom`. Internally normalized to an RRULE-subset `{ freq, interval, until? }`
  (`frequencyToRule()` in `src/lib/recurrence/engine.ts`) — e.g. "quarterly" = `MONTHLY` with
  `interval: 3`, "biweekly" = `WEEKLY` with `interval: 2`.
- `next_due_date` advances via `computeNextOccurrence()`; `advancePastDueDates()` catches up a
  template that's fallen behind (e.g. app wasn't opened for a while), generating/advancing through
  every occurrence up to today or `end_date`.
- If `auto_create: true`, occurrences generate automatically; otherwise the user confirms each one.
  Either way, the generated transaction's `client_id` is deterministic
  (UUIDv5 of the recurring expense + occurrence date, namespace `RECURRING_TX_NAMESPACE`) so
  re-running generation never duplicates a transaction.
- Optional Google Calendar sync creates a reminder event per occurrence (see
  [`auth.md`](auth.md#google-calendar-oauth-separate-optional)).

## Payment settlement guarantees (Mercado Pago)

Enforced by unique constraints (`supabase/migrations/20260711184932_mercadopago_payments.sql`) plus
application logic in `src/lib/payments/payment-service.ts`:

1. One `payment_attempts` row per checkout attempt (`UNIQUE (provider, external_reference)`).
2. One webhook event key per notification (`UNIQUE (provider, provider_event_key)`) — replayed
   webhooks are detected and skipped (`{ received: true, duplicate: true }`).
3. One `provider_payment_id` bound to at most one attempt (`UNIQUE (provider, provider_payment_id)`).
4. One ledger transaction per attempt (`UNIQUE (user_id, transaction_client_id)`), only created once
   the provider reports `status: "approved"` and the amount matches (±1 cent rounding tolerance).
5. If the payment is for a recurring expense occurrence, settlement also advances that recurring
   expense's `next_due_date` (`advanceRecurringExpenseAfterPayment`).
6. Account/investment balances are never written directly by the payment flow — they're always
   derived from the `transactions` table, same as any other expense.

## Default categories (new user seed)

Seeded once by `ensureUserSetup()` from `src/lib/categories/migration-defaults.ts` if a user has no
categories yet:

- **Expense**: Vivienda, Alimentación, Transporte, Salud, Educación, Entretenimiento,
  Suscripciones, Servicios, Ropa, Otros.
- **Income**: Sueldo, Freelance, Negocio, Ingresos pasivos, Dividendos, Intereses, Extraordinario.
- **Investment** (category "Crecimiento" with subcategories): Acciones, ETFs, Bonos, Fondos
  mutuos, Cripto, Capacitación, Otros.

## Legacy terminology to be aware of

- `/gastos`, `/ingresos`, `/gastos-recurrentes` were the original separate sections; they now
  redirect to the unified `/transacciones` flow (see `next.config.ts`). Don't build new UI against
  the old paths.
- "Patrimonio" in earlier planning docs implied manual assets/liabilities (property, debts) — not
  implemented; today it strictly means cash + investment holdings.
