# 0006 — Mercado Pago Checkout Pro for payments

## Context

The app wanted to let users actually pay a tracked expense (e.g. a bill) rather than only recording
that it was paid elsewhere. Argentina's dominant payment processor is Mercado Pago, which offers
several integration depths: hosted redirect checkout (Checkout Pro), an embedded card form
(Checkout API / Bricks), or raw card tokenization.

## Decision

Use **Checkout Pro** (Preferences API + hosted, redirect-based checkout) rather than embedding card
collection. The app never touches card data — it creates a "preference" (`PaymentService
.createCheckout`), redirects the user to Mercado Pago's hosted page, and receives an authoritative
webhook on settlement. Business logic is behind a `PaymentAdapter` interface
(`src/lib/payments/types.ts`) so a future provider could be added without changing
`PaymentService`; `MercadoPago` is the only implementation today
(`src/lib/payments/providers/mercadopago/`).

## Consequences

- Zero PCI scope for this app — Mercado Pago hosts the card form entirely.
- The webhook is the only authoritative settlement signal; the return-URL redirect after payment is
  UX-only and may arrive before the webhook, so `GET /api/payments/[id]/status` supports an
  explicit reconciliation call as a fallback (see [`../api.md`](../api.md)).
- Checkout Pro requires a **public HTTPS** origin for `back_urls`/`notification_url` — plain
  `localhost` doesn't work, which complicates local end-to-end testing (needs a tunnel). See
  [`../deploy.md`](../deploy.md).
- Currently ARS-only (`PaymentService.createCheckout` rejects other currencies) — ties payments to
  the multi-currency model from ADR 0005 for future work, not yet solved.
