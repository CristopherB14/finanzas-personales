import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPaymentService } from "@/lib/payments/payment-service";
import { createCheckoutBodySchema } from "@/lib/payments/validation";
import { isMercadoPagoConfigured } from "@/lib/payments/providers/mercadopago/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { error: "Mercado Pago no está configurado" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createCheckoutBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const origin = new URL(request.url).origin;

  try {
    const service = createPaymentService();
    const session = await service.createCheckout(
      {
        userId: user.id,
        accountId: body.account_id,
        categoryId: body.category_id ?? null,
        amountCents: body.amount_cents,
        currencyCode: body.currency_code,
        description: body.description,
        transactionDate: body.transaction_date,
        recurringExpenseId: body.recurring_expense_id ?? null,
        occurrenceDate: body.occurrence_date ?? null,
        transactionClientId: body.transaction_client_id,
        originalAmountCents: body.original_amount_cents,
        exchangeRate: body.exchange_rate,
        convertedAmountCents: body.converted_amount_cents,
        exchangeRateSource: body.exchange_rate_source,
        payerEmail: user.email,
      },
      origin
    );

    return NextResponse.json({
      attempt_id: session.attemptId,
      checkout_url: session.checkoutUrl,
      preference_id: session.preferenceId,
      status: session.status,
    });
  } catch (err) {
    console.error("Payment checkout create failed", err);
    const message =
      err instanceof Error ? err.message : "Failed to create checkout";
    const status =
      message.includes("ARS") || message.includes("Invalid") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
