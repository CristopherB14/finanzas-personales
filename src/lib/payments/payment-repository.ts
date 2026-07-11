import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PaymentAttemptRow,
  PaymentAttemptStatus,
  PaymentProviderId,
  PaymentWebhookStatus,
} from "@/lib/payments/types";

export type InsertPaymentAttemptInput = {
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
  external_reference: string;
  original_amount_cents?: number | null;
  exchange_rate?: number | null;
  converted_amount_cents?: number | null;
  exchange_rate_source?: "bna" | "manual" | null;
  metadata?: Record<string, unknown>;
};

export async function insertPaymentAttempt(
  input: InsertPaymentAttemptInput
): Promise<PaymentAttemptRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_attempts")
    .insert({
      id: input.id,
      user_id: input.user_id,
      provider: input.provider,
      status: input.status,
      amount_cents: input.amount_cents,
      currency_code: input.currency_code,
      account_id: input.account_id,
      category_id: input.category_id,
      description: input.description,
      transaction_date: input.transaction_date,
      recurring_expense_id: input.recurring_expense_id,
      occurrence_date: input.occurrence_date,
      transaction_client_id: input.transaction_client_id,
      external_reference: input.external_reference,
      provider_preference_id: null,
      provider_payment_id: null,
      checkout_url: null,
      error_message: null,
      original_amount_cents: input.original_amount_cents ?? input.amount_cents,
      exchange_rate: input.exchange_rate ?? null,
      converted_amount_cents: input.converted_amount_cents ?? null,
      exchange_rate_source: input.exchange_rate_source ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as PaymentAttemptRow;
}

export async function updatePaymentAttempt(
  id: string,
  patch: Partial<{
    status: PaymentAttemptStatus;
    provider_preference_id: string | null;
    provider_payment_id: string | null;
    checkout_url: string | null;
    error_message: string | null;
    metadata: Record<string, unknown>;
  }>
): Promise<PaymentAttemptRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_attempts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as PaymentAttemptRow;
}

export async function getPaymentAttemptById(
  id: string
): Promise<PaymentAttemptRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_attempts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as PaymentAttemptRow | null) ?? null;
}

export async function getPaymentAttemptForUser(
  id: string,
  userId: string
): Promise<PaymentAttemptRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_attempts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as PaymentAttemptRow | null) ?? null;
}

export async function getPaymentAttemptByExternalReference(
  provider: PaymentProviderId,
  externalReference: string
): Promise<PaymentAttemptRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_attempts")
    .select("*")
    .eq("provider", provider)
    .eq("external_reference", externalReference)
    .maybeSingle();

  if (error) throw error;
  return (data as PaymentAttemptRow | null) ?? null;
}

export async function getPaymentAttemptByProviderPaymentId(
  provider: PaymentProviderId,
  providerPaymentId: string
): Promise<PaymentAttemptRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_attempts")
    .select("*")
    .eq("provider", provider)
    .eq("provider_payment_id", providerPaymentId)
    .maybeSingle();

  if (error) throw error;
  return (data as PaymentAttemptRow | null) ?? null;
}

export async function listRecentPaymentAttempts(
  userId: string,
  limit = 20
): Promise<PaymentAttemptRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_attempts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as PaymentAttemptRow[]) ?? [];
}

export async function insertWebhookEvent(input: {
  provider: PaymentProviderId;
  provider_event_key: string;
  topic: string | null;
  action: string | null;
  provider_resource_id: string | null;
  payload: Record<string, unknown>;
  signature_valid: boolean;
  processing_status?: PaymentWebhookStatus;
}): Promise<{ id: string; alreadyExists: boolean }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_webhook_events")
    .insert({
      provider: input.provider,
      provider_event_key: input.provider_event_key,
      topic: input.topic,
      action: input.action,
      provider_resource_id: input.provider_resource_id,
      payload: input.payload,
      signature_valid: input.signature_valid,
      processing_status: input.processing_status ?? "received",
    })
    .select("id")
    .single();

  if (error) {
    // Unique violation → already processed / received (idempotent).
    if (error.code === "23505") {
      const existing = await admin
        .from("payment_webhook_events")
        .select("id, processing_status")
        .eq("provider", input.provider)
        .eq("provider_event_key", input.provider_event_key)
        .maybeSingle();
      return {
        id: (existing.data as { id: string } | null)?.id ?? "",
        alreadyExists: true,
      };
    }
    throw error;
  }

  return { id: (data as { id: string }).id, alreadyExists: false };
}

export async function updateWebhookEvent(
  id: string,
  patch: {
    processing_status: PaymentWebhookStatus;
    payment_attempt_id?: string | null;
    error_message?: string | null;
    processed_at?: string | null;
  }
): Promise<void> {
  if (!id) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("payment_webhook_events")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export type LedgerTransactionInsert = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: "expense";
  amount_cents: number;
  currency_code: string;
  original_amount_cents: number;
  exchange_rate: number | null;
  converted_amount_cents: number | null;
  exchange_rate_source: "bna" | "manual" | null;
  transaction_date: string;
  description: string | null;
  tags: string[];
  client_id: string;
  recurring_expense_id: string | null;
};

/**
 * Idempotent ledger write: UNIQUE (user_id, client_id).
 * Exactly one financial transaction per successful payment attempt.
 */
export async function upsertLedgerExpense(
  tx: LedgerTransactionInsert
): Promise<{ id: string; created: boolean }> {
  const admin = createAdminClient();

  const existing = await admin
    .from("transactions")
    .select("id")
    .eq("user_id", tx.user_id)
    .eq("client_id", tx.client_id)
    .maybeSingle();

  if (existing.data) {
    return { id: (existing.data as { id: string }).id, created: false };
  }

  const { data, error } = await admin
    .from("transactions")
    .upsert(
      {
        id: tx.id,
        user_id: tx.user_id,
        account_id: tx.account_id,
        category_id: tx.category_id,
        type: tx.type,
        amount_cents: tx.amount_cents,
        currency_code: tx.currency_code,
        original_amount_cents: tx.original_amount_cents,
        exchange_rate: tx.exchange_rate,
        converted_amount_cents: tx.converted_amount_cents,
        exchange_rate_source: tx.exchange_rate_source,
        transaction_date: tx.transaction_date,
        description: tx.description,
        tags: tx.tags,
        client_id: tx.client_id,
        recurring_expense_id: tx.recurring_expense_id,
      },
      { onConflict: "user_id,client_id", ignoreDuplicates: true }
    )
    .select("id")
    .single();

  if (error) {
    // Race: another worker inserted first.
    if (error.code === "23505") {
      const again = await admin
        .from("transactions")
        .select("id")
        .eq("user_id", tx.user_id)
        .eq("client_id", tx.client_id)
        .maybeSingle();
      if (again.data) {
        return { id: (again.data as { id: string }).id, created: false };
      }
    }
    throw error;
  }

  return { id: (data as { id: string }).id, created: true };
}

export async function advanceRecurringExpenseAfterPayment(input: {
  userId: string;
  recurringExpenseId: string;
  occurrenceDate: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: expense, error } = await admin
    .from("recurring_expenses")
    .select("id, user_id, next_due_date, recurrence_rule, end_date")
    .eq("id", input.recurringExpenseId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (error) throw error;
  if (!expense) return;

  const row = expense as unknown as {
    id: string;
    next_due_date: string;
    recurrence_rule: import("@/types/recurrence").RecurrenceRule;
    end_date: string | null;
  };

  // Only advance if we paid the currently due occurrence.
  if (row.next_due_date !== input.occurrenceDate) return;

  const { computeNextOccurrence } = await import("@/lib/recurrence/engine");
  const nextDue = computeNextOccurrence(
    input.occurrenceDate,
    row.recurrence_rule
  );

  const { error: updateError } = await admin
    .from("recurring_expenses")
    .update({
      next_due_date: nextDue,
      last_generated_date: input.occurrenceDate,
    })
    .eq("id", input.recurringExpenseId)
    .eq("user_id", input.userId);

  if (updateError) throw updateError;
}

export async function verifyAccountOwnedByUser(
  userId: string,
  accountId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function verifyCategoryOwnedByUser(
  userId: string,
  categoryId: string | null
): Promise<boolean> {
  if (!categoryId) return true;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
