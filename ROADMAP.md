# Roadmap

Status snapshot as of 2026-07-16. "Done" means implemented in the current codebase, not necessarily
polished. See [`TODO.md`](TODO.md) for granular pending work and [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md)
for gaps in what's already shipped.

## MVP — done

Original goal: replace a spreadsheet for income/expense tracking with an offline-capable app.

| Milestone | Status | Notes |
|---|---|---|
| Auth + profile | ✅ Done | Supabase email/password, `profiles` row auto-created on signup |
| Accounts & categories | ✅ Done | CRUD + first-login seed (`src/lib/data/seed-user.ts`) |
| Transactions (income/expense) | ✅ Done | Unified `/transacciones` flow, offline-first |
| Dashboard | ✅ Done | Net worth, savings traffic light, 6-month chart, emergency-fund months |
| Budget | ✅ Done | Per-category/subcategory limits (fixed or % of income), 80/100% thresholds |
| Offline + sync | ✅ Done | Dexie + sync queue + LWW merge, auto-sync every 60s / on `online` |
| PWA | ✅ Done | `manifest.json` + `sw.js`, installable |
| CSV export | ❌ Not built | Was in the original MVP scope, never implemented |

## Shipped beyond the original MVP scope

These were not in the original MVP plan but are implemented today:

- **Transfers between accounts** (single-row model with `to_account_id`).
- **Investments** as a first-class transaction/category type, with portfolio assets
  (`investment_assets`) tracking invested vs. market value.
- **Recurring expenses** with an RRULE-subset engine, auto-creation, and Google Calendar reminders.
- **Multi-currency (ARS/USD)**: per-transaction FX conversion, BNA/dolarapi live rate lookup.
- **Google Calendar integration**: OAuth2, create calendar events/reminders for transactions and
  recurring expenses.
- **Mercado Pago payments**: Checkout Pro flow that creates an expense transaction on webhook
  settlement.

## Not started

Carried over from the original post-MVP plan; nothing below has any code yet:

- Debts (cards, loans, snowball/avalanche payoff strategy).
- Net worth with manual assets/liabilities beyond cash + investment holdings.
- Financial goals with progress bars.
- Excel/PDF import/export.
- Investment market pricing (the `market_value_cents` column exists but nothing populates it
  automatically).
- Conversational AI / natural-language insights.
- Shared households / multi-user workspaces.
- Bank integrations (Open Banking).
- Manual sync-conflict resolution UI (conflicts are currently silently resolved last-write-wins).
- Automated tests and CI (see [`docs/testing.md`](docs/testing.md)).

## Suggested next priorities

Not a commitment, just the most obviously missing pieces given what's built:

1. Automated tests for `src/lib/finance/*` (pure functions, cheapest to test) and the sync engine.
2. CSV export (small, high user value, closes out the original MVP).
3. Investment market pricing (the data model already supports it).
4. Basic CI (lint + build) on pull requests.
