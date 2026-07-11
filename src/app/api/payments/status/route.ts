import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPaymentService } from "@/lib/payments/payment-service";
import { isMercadoPagoConfigured } from "@/lib/payments/providers/mercadopago/config";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ configured: false, attempts: [] });
  }

  const service = createPaymentService();
  const attempts = await service.listAttempts(user.id);

  return NextResponse.json({
    configured: true,
    attempts: attempts.map((a) => ({
      id: a.id,
      status: a.status,
      amount_cents: a.amount_cents,
      currency_code: a.currency_code,
      description: a.description,
      created_at: a.created_at,
      updated_at: a.updated_at,
      error_message: a.error_message,
    })),
  });
}
