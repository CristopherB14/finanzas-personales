"use client";

export type StartCheckoutInput = {
  account_id: string;
  category_id?: string | null;
  amount_cents: number;
  currency_code: "ARS" | "USD";
  description: string;
  transaction_date: string;
  recurring_expense_id?: string | null;
  occurrence_date?: string | null;
  transaction_client_id?: string;
  original_amount_cents?: number;
  exchange_rate?: number | null;
  converted_amount_cents?: number | null;
  exchange_rate_source?: "bna" | "manual" | null;
};

export type StartCheckoutResult = {
  attempt_id: string;
  checkout_url: string;
  preference_id: string;
  status: string;
};

export async function startMercadoPagoCheckout(
  input: StartCheckoutInput
): Promise<StartCheckoutResult> {
  const response = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    attempt_id?: string;
    checkout_url?: string;
    preference_id?: string;
    status?: string;
  };

  if (!response.ok || !data.checkout_url || !data.attempt_id) {
    throw new Error(data.error || "No se pudo iniciar el pago");
  }

  return {
    attempt_id: data.attempt_id,
    checkout_url: data.checkout_url,
    preference_id: data.preference_id ?? "",
    status: data.status ?? "checkout_created",
  };
}

export async function fetchPaymentAttemptStatus(
  attemptId: string,
  paymentId?: string | null
) {
  const qs = paymentId
    ? `?payment_id=${encodeURIComponent(paymentId)}`
    : "";
  const response = await fetch(
    `/api/payments/${encodeURIComponent(attemptId)}/status${qs}`
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Error al consultar el pago"
    );
  }
  return data as {
    id: string;
    status: string;
    amount_cents: number;
    currency_code: string;
    description: string | null;
    transaction_client_id: string;
    provider_payment_id: string | null;
    error_message: string | null;
    updated_at: string;
  };
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "approved":
      return "Pagado";
    case "rejected":
      return "Rechazado";
    case "cancelled":
      return "Cancelado";
    case "refunded":
      return "Reembolsado";
    case "in_process":
    case "pending":
    case "checkout_created":
      return "Pendiente de confirmación";
    default:
      return status;
  }
}
