import { NextResponse } from "next/server";
import { createPaymentService } from "@/lib/payments/payment-service";

export const runtime = "nodejs";

/**
 * Mercado Pago webhook receiver.
 * - Validates x-signature (HMAC)
 * - Idempotent via payment_webhook_events unique key
 * - Fetches payment from official API before trusting status
 * - Settles ledger exactly once
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams;

  let body: unknown = null;
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = { raw: text };
        }
      }
    }
  } catch {
    body = null;
  }

  const service = createPaymentService();
  const result = await service.handleMercadoPagoWebhook({
    query,
    headers: request.headers,
    body,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: result.status });
  }

  return NextResponse.json({ received: true, duplicate: result.duplicate ?? false });
}

/** Mercado Pago may send GET health/validation probes. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
