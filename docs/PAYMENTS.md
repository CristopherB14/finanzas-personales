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

## Preference URLs (back_urls / auto_return)

Mercado Pago rules ([configure back URLs](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/configure-back-urls)):

- `back_urls.*` must be **HTTPS** public URLs (named domain / tunnel)
- **Do not** use `localhost` or `127.0.0.1`
- `auto_return: "approved"` is sent **only** when `back_urls.success` is valid

Resolution order for the public origin:

1. `NEXT_PUBLIC_APP_URL` if it is public HTTPS
2. Else the request `Origin` if it is public HTTPS
3. Else omit `back_urls`, `auto_return`, and `notification_url` (preference still creates)

Local full-flow testing: set `NEXT_PUBLIC_APP_URL` to an HTTPS tunnel (e.g. ngrok) pointing at your app.

Generated paths when a public origin exists:

- success → `{origin}/pagos/resultado?attempt_id={id}&status=success`
- pending → `{origin}/pagos/resultado?attempt_id={id}&status=pending`
- failure → `{origin}/pagos/resultado?attempt_id={id}&status=failure`
- notification → `{origin}/api/payments/mercadopago/webhook`

## Settlement guarantees

1. One `payment_attempts` row per checkout (`external_reference` unique)
2. One webhook event key (`provider`, `provider_event_key`) unique
3. One `provider_payment_id` bound to at most one attempt
4. One ledger `transactions` row via `UNIQUE (user_id, client_id)`
5. Balances/reports/budgets derive from transactions (no separate balance writes)

## Offline sync

Webhook writes Postgres. Client discovers the expense via existing sync pull (`syncAll` / 60s auto-sync).
