import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPaymentService } from "@/lib/payments/payment-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const providerPaymentId = url.searchParams.get("payment_id");

  const service = createPaymentService();

  try {
    const attempt = providerPaymentId
      ? await service.reconcileAttemptFromProvider(
          id,
          user.id,
          providerPaymentId
        )
      : await service.getAttemptForUser(id, user.id);

    if (!attempt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: attempt.id,
      status: attempt.status,
      amount_cents: attempt.amount_cents,
      currency_code: attempt.currency_code,
      description: attempt.description,
      transaction_client_id: attempt.transaction_client_id,
      provider_payment_id: attempt.provider_payment_id,
      error_message: attempt.error_message,
      updated_at: attempt.updated_at,
    });
  } catch (err) {
    console.error("Payment status failed", err);
    return NextResponse.json(
      { error: "Failed to load payment status" },
      { status: 502 }
    );
  }
}
