# Business rules cheat sheet

Condensed from `docs/domain.md` (read that for full explanation). Use this to avoid re-deriving
thresholds/formulas from `src/lib/finance/calculations.ts` on every task.

```
savingsTrafficLight(rate):     rate >= 20% → green | 10–19% → yellow | < 10% → red
budgetTrafficLight(percent):   percent < 80% → green | 80–100% → yellow | > 100% → red
monthlySavings   = income − expense − investment (per currency)
savingsRate      = savings / income × 100  (0 if income <= 0)
netWorth         = cash + investment holdings (per currency; never mixed ARS/USD)
emergencyMonths  = availableCash / avg(last 3 months' expenses)
budgetLimit      = fixedCents, OR percentage × monthlyIncome (category) / × parentCategoryLimit (subcategory)
exchangeRate     = always ARS per 1 USD
```

Transfers = one `transactions` row, `account_id` (source) + `to_account_id` (destination), never two
rows. Transactions are always positive `amount_cents`; effect is determined by `type`.

Recurring expense frequency → RRULE subset: quarterly = MONTHLY interval 3, biweekly = WEEKLY
interval 2 (see `src/lib/recurrence/engine.ts::frequencyToRule`).

Payment settlement (Mercado Pago) creates exactly one ledger transaction per attempt, only on
provider status `"approved"`, idempotent via `UNIQUE (user_id, transaction_client_id)`.
