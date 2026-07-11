# Mercado Pago payments — architecture notes

## Why Checkout Pro

- Official Preferences API + hosted checkout (redirect)
- No card data on our servers (PCI scope stays with Mercado Pago)
- Webhooks for authoritative settlement
- Lowest integration effort vs Checkout API / Bricks for this MVP

## Abstractions

```
UI → /api/payments/* → PaymentService → PaymentAdapter (MercadoPago)
                     ↘ PaymentRepository → Supabase (service role)
```

Future providers implement `PaymentAdapter` only.

## Settlement guarantees

1. One `payment_attempts` row per checkout (`external_reference` unique)
2. One webhook event key (`provider`, `provider_event_key`) unique
3. One `provider_payment_id` bound to at most one attempt
4. One ledger `transactions` row via `UNIQUE (user_id, client_id)`
5. Balances/reports/budgets derive from transactions (no separate balance writes)

## Offline sync

Webhook writes Postgres. Client discovers the expense via existing sync pull (`syncAll` / 60s auto-sync).
