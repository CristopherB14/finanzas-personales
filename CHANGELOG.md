# Changelog

Reconstructed from git history (`git log`). Grouped by theme rather than strictly by commit, since
early commits bundle multiple changes. Dates are commit dates. This file is a historical record —
add new entries under "Unreleased" going forward instead of editing past sections.

## Unreleased

_Nothing yet. Add entries here as you make changes, then move them into a dated section on release._

## 2026-07-11 — Mercado Pago payments

- Added Checkout Pro integration: `payment_attempts` / `payment_webhook_events` tables,
  `/api/payments/checkout`, `/api/payments/status`, `/api/payments/[id]/status`,
  `/api/payments/mercadopago/webhook`.
- Webhook settles payments into the ledger exactly once (idempotent by `external_reference`,
  `provider_payment_id`, and `transaction_client_id`).
- Documented public-HTTPS requirement for Mercado Pago `back_urls`/`notification_url`
  (`NEXT_PUBLIC_APP_URL`, no `localhost`).
- Saving-state UX improvements across transaction forms.

## 2026-07-10 — Multi-currency & rebrand

- Introduced ARS/USD multi-currency support: `original_amount_cents`, `exchange_rate`,
  `converted_amount_cents`, `exchange_rate_source` on `transactions` and `recurring_expenses`.
- Added BNA exchange-rate lookup (`/api/exchange-rate/bna`, dolarapi fallback).
- Rebranded the app to **Klaro**; refreshed layout, navigation, and branding components.
- Continued hardening of Google OAuth env var handling and diagnostics.

## 2026-06-24–28 — Google Calendar integration

- Added Google OAuth2 flow (`/api/google-calendar/auth`, `/callback`, `/status`, `/disconnect`,
  `/create-event`) with backend-only token storage (`user_google_integrations`, service-role only).
- Added hooks/UI to sync transactions and recurring expenses to Google Calendar as events/reminders.
- Iterated on redirect-URI resolution and token-exchange error handling/diagnostics.
- (Later reverted) removed and re-documented `.env.example` handling.

## 2026-06-23 — Security hardening

- Hardened Postgres functions per Supabase security advisors: fixed `search_path` on
  `set_updated_at`, revoked implicit `EXECUTE` grants on trigger functions from `anon`/`authenticated`.
- Backend-only Google OAuth tokens, stricter CSP/security headers, input validation.

## 2026-06-20–21 — Transfers, recurring expenses, transaction routing

- Added transfer transactions (`to_account_id` on `transactions`, single-row model).
- Added recurring expenses (RRULE-subset engine, auto-create, reminders).
- Unified `/gastos`, `/ingresos`, `/gastos-recurrentes` into a single `/transacciones` flow with
  redirects for the legacy paths.
- Removed the classic `middleware.ts` (superseded by `src/proxy.ts`).
- Multiple accessibility and responsiveness passes (Dialog `aria-describedby`, layout min-width,
  `useOnline` via `useSyncExternalStore`).

## 2026-06-19–20 — Investments & categories

- Added investment transaction/category type and `investment_assets` table (invested vs. market
  value, keyed by subcategory).
- Added subcategory support across categories, transactions, and budgets.
- Added account/category "variant" support for inline creation from other forms.

## 2026-06-17–18 — Accounts & budgets

- Added `description`, `icon`, `color` to `accounts`.
- Added budget limits (fixed or % of income) per category, resolved against monthly income.
- Removed hardcoded default categories in favor of the first-login seed
  (`src/lib/data/seed-user.ts`).

## 2026-06-02 — Initial schema and project setup

- Initial Next.js app scaffold (Create Next App), then project structure and configuration.
- Initial Supabase schema: `profiles`, `accounts`, `categories`, `transactions`, `budgets`,
  `budget_lines`, full RLS, `updated_at` triggers, `handle_new_user` profile bootstrap.
