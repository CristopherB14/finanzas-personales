/**
 * Provider-agnostic payment domain types.
 * Business logic depends on these interfaces — never on Mercado Pago directly.
 */

export type PaymentProviderId = "mercadopago";

export type PaymentAttemptStatus =
  | "pending"
  | "checkout_created"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "in_process";

export type PaymentWebhookStatus =
  | "received"
  | "processed"
  | "ignored"
  | "error";

export interface CreateCheckoutInput {
  userId: string;
  accountId: string;
  categoryId: string | null;
  amountCents: number;
  currencyCode: "ARS" | "USD";
  description: string;
  transactionDate: string;
  recurringExpenseId?: string | null;
  occurrenceDate?: string | null;
  /** Deterministic client_id for the eventual ledger transaction. */
  transactionClientId?: string;
  originalAmountCents?: number;
  exchangeRate?: number | null;
  convertedAmountCents?: number | null;
  exchangeRateSource?: "bna" | "manual" | null;
  payerEmail?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CheckoutSession {
  attemptId: string;
  provider: PaymentProviderId;
  checkoutUrl: string;
  preferenceId: string;
  externalReference: string;
  status: PaymentAttemptStatus;
}

export interface ProviderPaymentStatus {
  providerPaymentId: string;
  status: PaymentAttemptStatus;
  statusDetail?: string | null;
  amountCents: number;
  currencyCode: string;
  externalReference: string | null;
  preferenceId: string | null;
  paidAt?: string | null;
  raw: unknown;
}

export interface CreatePreferenceParams {
  externalReference: string;
  title: string;
  amountCents: number;
  currencyCode: "ARS";
  /** Omit when not a public HTTPS URL (e.g. localhost). */
  notificationUrl?: string | null;
  /** Omit entirely when URLs are not MP-acceptable (localhost / http). */
  backUrls?: {
    success: string;
    pending: string;
    failure: string;
  } | null;
  /** Only set when back_urls.success is valid; never send alone. */
  autoReturn?: "approved";
  payerEmail?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreatePreferenceResult {
  preferenceId: string;
  checkoutUrl: string;
  sandboxCheckoutUrl?: string | null;
  raw: unknown;
}

/**
 * Adapter contract for a concrete payment provider (Mercado Pago, Stripe, …).
 */
export interface PaymentAdapter {
  readonly providerId: PaymentProviderId;
  createPreference(
    params: CreatePreferenceParams
  ): Promise<CreatePreferenceResult>;
  getPayment(providerPaymentId: string): Promise<ProviderPaymentStatus>;
  verifyWebhookSignature(input: {
    xSignature: string | null;
    xRequestId: string | null;
    dataId: string | null;
  }): boolean;
}

export interface PaymentAttemptRow {
  id: string;
  user_id: string;
  provider: PaymentProviderId;
  status: PaymentAttemptStatus;
  amount_cents: number;
  currency_code: string;
  account_id: string;
  category_id: string | null;
  description: string | null;
  transaction_date: string;
  recurring_expense_id: string | null;
  occurrence_date: string | null;
  transaction_client_id: string;
  provider_preference_id: string | null;
  provider_payment_id: string | null;
  external_reference: string;
  checkout_url: string | null;
  original_amount_cents: number | null;
  exchange_rate: number | null;
  converted_amount_cents: number | null;
  exchange_rate_source: "bna" | "manual" | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
