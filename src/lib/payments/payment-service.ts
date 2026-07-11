import { v4 as uuidv4, v5 as uuidv5 } from "uuid";
import { createMercadoPagoAdapter } from "@/lib/payments/providers/mercadopago/adapter";
import { isMercadoPagoConfigured } from "@/lib/payments/providers/mercadopago/config";
import {
  buildMercadoPagoBackUrls,
  buildMercadoPagoNotificationUrl,
  resolveMercadoPagoPublicOrigin,
} from "@/lib/payments/providers/mercadopago/urls";
import {
  advanceRecurringExpenseAfterPayment,
  getPaymentAttemptByExternalReference,
  getPaymentAttemptById,
  getPaymentAttemptByProviderPaymentId,
  getPaymentAttemptForUser,
  insertPaymentAttempt,
  insertWebhookEvent,
  listRecentPaymentAttempts,
  updatePaymentAttempt,
  updateWebhookEvent,
  upsertLedgerExpense,
  verifyAccountOwnedByUser,
  verifyCategoryOwnedByUser,
} from "@/lib/payments/payment-repository";
import type {
  CheckoutSession,
  CreateCheckoutInput,
  PaymentAdapter,
  PaymentAttemptRow,
  PaymentProviderId,
  ProviderPaymentStatus,
} from "@/lib/payments/types";

/** Namespace for deterministic payment → transaction client_ids. */
export const PAYMENT_TX_NAMESPACE = "7c2e9a1b-4f58-4d3a-9c0e-1b2a3d4e5f60";

export function paymentTransactionClientId(attemptId: string): string {
  return uuidv5(`payment:${attemptId}`, PAYMENT_TX_NAMESPACE);
}

function getAdapter(provider: PaymentProviderId): PaymentAdapter {
  switch (provider) {
    case "mercadopago":
      return createMercadoPagoAdapter();
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unsupported payment provider: ${_exhaustive}`);
    }
  }
}

/**
 * PaymentService — business orchestration.
 * Depends on PaymentAdapter + PaymentRepository, not Mercado Pago HTTP details.
 */
export class PaymentService {
  async createCheckout(
    input: CreateCheckoutInput,
    requestOrigin: string
  ): Promise<CheckoutSession> {
    if (!isMercadoPagoConfigured()) {
      throw new Error("Mercado Pago is not configured");
    }

    if (input.currencyCode !== "ARS") {
      throw new Error(
        "Mercado Pago checkout MVP solo admite montos en ARS. Convertí a ARS antes de pagar."
      );
    }

    const accountOk = await verifyAccountOwnedByUser(
      input.userId,
      input.accountId
    );
    if (!accountOk) {
      throw new Error("Invalid account");
    }

    const categoryOk = await verifyCategoryOwnedByUser(
      input.userId,
      input.categoryId
    );
    if (!categoryOk) {
      throw new Error("Invalid category");
    }

    const attemptId = uuidv4();
    const transactionClientId =
      input.transactionClientId || paymentTransactionClientId(attemptId);
    // external_reference: max 64 chars, alphanumeric + - _
    const externalReference = attemptId.replace(/-/g, "").slice(0, 64);

    await insertPaymentAttempt({
      id: attemptId,
      user_id: input.userId,
      provider: "mercadopago",
      status: "pending",
      amount_cents: input.amountCents,
      currency_code: input.currencyCode,
      account_id: input.accountId,
      category_id: input.categoryId,
      description: input.description,
      transaction_date: input.transactionDate,
      recurring_expense_id: input.recurringExpenseId ?? null,
      occurrence_date: input.occurrenceDate ?? null,
      transaction_client_id: transactionClientId,
      external_reference: externalReference,
      original_amount_cents: input.originalAmountCents ?? input.amountCents,
      exchange_rate: input.exchangeRate ?? null,
      converted_amount_cents: input.convertedAmountCents ?? null,
      exchange_rate_source: input.exchangeRateSource ?? null,
      metadata: input.metadata ?? {},
    });

    // MP rejects localhost/http for back_urls. Only attach when we have a
    // public HTTPS origin (production domain or tunnel like ngrok).
    const publicOrigin = resolveMercadoPagoPublicOrigin(requestOrigin);
    const backUrls = publicOrigin
      ? buildMercadoPagoBackUrls(publicOrigin, attemptId)
      : null;
    const notificationUrl = publicOrigin
      ? buildMercadoPagoNotificationUrl(publicOrigin)
      : null;

    if (!publicOrigin) {
      console.warn(
        "[payments] NEXT_PUBLIC_APP_URL is not a public HTTPS URL. " +
          "Creating preference without back_urls/auto_return/notification_url. " +
          "Set NEXT_PUBLIC_APP_URL to your production domain or an HTTPS tunnel " +
          "(e.g. ngrok) for return redirects and webhooks."
      );
    }

    const adapter = getAdapter("mercadopago");

    const preference = await adapter.createPreference({
      externalReference,
      title: input.description || "Gasto",
      amountCents: input.amountCents,
      currencyCode: "ARS",
      notificationUrl,
      backUrls,
      payerEmail: input.payerEmail,
      metadata: {
        attempt_id: attemptId,
        user_id: input.userId,
      },
    });

    const updated = await updatePaymentAttempt(attemptId, {
      status: "checkout_created",
      provider_preference_id: preference.preferenceId,
      checkout_url: preference.checkoutUrl,
    });

    return {
      attemptId: updated.id,
      provider: "mercadopago",
      checkoutUrl: preference.checkoutUrl,
      preferenceId: preference.preferenceId,
      externalReference,
      status: updated.status,
    };
  }

  async getAttemptForUser(
    attemptId: string,
    userId: string
  ): Promise<PaymentAttemptRow | null> {
    return getPaymentAttemptForUser(attemptId, userId);
  }

  async listAttempts(userId: string): Promise<PaymentAttemptRow[]> {
    return listRecentPaymentAttempts(userId);
  }

  /**
   * Settle a provider payment into the ledger exactly once.
   */
  async settleProviderPayment(
    provider: PaymentProviderId,
    payment: ProviderPaymentStatus
  ): Promise<{ attempt: PaymentAttemptRow; settled: boolean }> {
    // Prefer lookup by already-linked payment id (retry safety).
    let attempt =
      (await getPaymentAttemptByProviderPaymentId(
        provider,
        payment.providerPaymentId
      )) ?? null;

    if (!attempt && payment.externalReference) {
      attempt = await getPaymentAttemptByExternalReference(
        provider,
        payment.externalReference
      );
    }

    if (!attempt) {
      throw new Error("Payment attempt not found for provider payment");
    }

    // Already terminal + ledger written.
    if (attempt.status === "approved" && attempt.provider_payment_id) {
      return { attempt, settled: false };
    }

    // Bind provider payment id early (unique constraint prevents double-bind).
    if (
      !attempt.provider_payment_id ||
      attempt.provider_payment_id !== payment.providerPaymentId
    ) {
      try {
        attempt = await updatePaymentAttempt(attempt.id, {
          provider_payment_id: payment.providerPaymentId,
          status:
            payment.status === "approved" ? attempt.status : payment.status,
          error_message: payment.statusDetail ?? null,
        });
      } catch (err) {
        // Unique collision: another attempt already owns this payment.
        const existing = await getPaymentAttemptByProviderPaymentId(
          provider,
          payment.providerPaymentId
        );
        if (existing) return { attempt: existing, settled: false };
        throw err;
      }
    }

    if (payment.status !== "approved") {
      attempt = await updatePaymentAttempt(attempt.id, {
        status: payment.status,
        error_message: payment.statusDetail ?? null,
      });
      return { attempt, settled: false };
    }

    // Amount sanity: allow 1 cent rounding tolerance.
    if (Math.abs(payment.amountCents - attempt.amount_cents) > 1) {
      attempt = await updatePaymentAttempt(attempt.id, {
        status: "rejected",
        error_message: `Amount mismatch: expected ${attempt.amount_cents}, got ${payment.amountCents}`,
      });
      return { attempt, settled: false };
    }

    const tags = ["mercadopago", "payment"];
    if (attempt.recurring_expense_id) tags.push("recurring");

    await upsertLedgerExpense({
      id: attempt.transaction_client_id,
      user_id: attempt.user_id,
      account_id: attempt.account_id,
      category_id: attempt.category_id,
      type: "expense",
      amount_cents: attempt.amount_cents,
      currency_code: attempt.currency_code,
      original_amount_cents:
        attempt.original_amount_cents ?? attempt.amount_cents,
      exchange_rate: attempt.exchange_rate,
      converted_amount_cents: attempt.converted_amount_cents,
      exchange_rate_source: attempt.exchange_rate_source,
      transaction_date: attempt.transaction_date,
      description: attempt.description,
      tags,
      client_id: attempt.transaction_client_id,
      recurring_expense_id: attempt.recurring_expense_id,
    });

    if (attempt.recurring_expense_id && attempt.occurrence_date) {
      await advanceRecurringExpenseAfterPayment({
        userId: attempt.user_id,
        recurringExpenseId: attempt.recurring_expense_id,
        occurrenceDate: attempt.occurrence_date,
      });
    }

    attempt = await updatePaymentAttempt(attempt.id, {
      status: "approved",
      provider_payment_id: payment.providerPaymentId,
      error_message: null,
    });

    return { attempt, settled: true };
  }

  async handleMercadoPagoWebhook(input: {
    query: URLSearchParams;
    headers: Headers;
    body: unknown;
  }): Promise<{ ok: true; duplicate?: boolean } | { ok: false; status: number }> {
    const adapter = getAdapter("mercadopago");

    const topic =
      input.query.get("topic") ??
      input.query.get("type") ??
      (typeof input.body === "object" &&
      input.body &&
      "type" in input.body &&
      typeof (input.body as { type: unknown }).type === "string"
        ? (input.body as { type: string }).type
        : null);

    const action =
      typeof input.body === "object" &&
      input.body &&
      "action" in input.body &&
      typeof (input.body as { action: unknown }).action === "string"
        ? (input.body as { action: string }).action
        : null;

    const dataIdFromQuery = input.query.get("data.id") ?? input.query.get("id");
    const dataIdFromBody =
      typeof input.body === "object" &&
      input.body &&
      "data" in input.body &&
      typeof (input.body as { data: unknown }).data === "object" &&
      (input.body as { data: { id?: unknown } }).data &&
      typeof (input.body as { data: { id?: unknown } }).data.id !== "undefined"
        ? String((input.body as { data: { id: string | number } }).data.id)
        : null;

    const resourceId = dataIdFromQuery ?? dataIdFromBody;
    const xSignature = input.headers.get("x-signature");
    const xRequestId = input.headers.get("x-request-id");

    const signatureValid = adapter.verifyWebhookSignature({
      xSignature,
      xRequestId,
      dataId: resourceId,
    });

    if (!signatureValid) {
      console.error("Mercado Pago webhook signature invalid");
      return { ok: false, status: 401 };
    }

    const notificationId =
      typeof input.body === "object" &&
      input.body &&
      "id" in input.body
        ? String((input.body as { id: string | number }).id)
        : null;

    const providerEventKey =
      notificationId ??
      (resourceId && action
        ? `${topic ?? "payment"}:${resourceId}:${action}`
        : resourceId
          ? `${topic ?? "payment"}:${resourceId}`
          : `raw:${Date.now()}`);

    const { id: webhookEventId, alreadyExists } = await insertWebhookEvent({
      provider: "mercadopago",
      provider_event_key: providerEventKey,
      topic,
      action,
      provider_resource_id: resourceId,
      payload: {
        query: Object.fromEntries(input.query.entries()),
        body: input.body,
      },
      signature_valid: true,
    });

    if (alreadyExists) {
      return { ok: true, duplicate: true };
    }

    // Only process payment topic.
    const normalizedTopic = (topic ?? "").toLowerCase();
    if (
      normalizedTopic &&
      normalizedTopic !== "payment" &&
      !normalizedTopic.includes("payment")
    ) {
      await updateWebhookEvent(webhookEventId, {
        processing_status: "ignored",
        processed_at: new Date().toISOString(),
      });
      return { ok: true };
    }

    if (!resourceId) {
      await updateWebhookEvent(webhookEventId, {
        processing_status: "ignored",
        error_message: "Missing payment id",
        processed_at: new Date().toISOString(),
      });
      return { ok: true };
    }

    try {
      const payment = await adapter.getPayment(resourceId);
      const { attempt } = await this.settleProviderPayment(
        "mercadopago",
        payment
      );

      await updateWebhookEvent(webhookEventId, {
        processing_status: "processed",
        payment_attempt_id: attempt.id,
        processed_at: new Date().toISOString(),
      });

      return { ok: true };
    } catch (err) {
      console.error("Mercado Pago webhook processing failed", err);
      await updateWebhookEvent(webhookEventId, {
        processing_status: "error",
        error_message: err instanceof Error ? err.message : "Unknown error",
        processed_at: new Date().toISOString(),
      });
      // Return 200 to avoid infinite MP retries on permanent mapping errors;
      // return 500 only for transient failures would be ideal, but MP retries
      // aggressively — we rely on idempotency + event log for recovery.
      return { ok: true };
    }
  }

  /**
   * Optional return-URL reconciliation when webhook is delayed.
   */
  async reconcileAttemptFromProvider(
    attemptId: string,
    userId: string,
    providerPaymentId?: string | null
  ): Promise<PaymentAttemptRow | null> {
    const attempt = await getPaymentAttemptForUser(attemptId, userId);
    if (!attempt) return null;
    if (attempt.status === "approved") return attempt;

    if (!providerPaymentId) return attempt;

    const adapter = getAdapter(attempt.provider);
    const payment = await adapter.getPayment(providerPaymentId);
    const { attempt: settled } = await this.settleProviderPayment(
      attempt.provider,
      payment
    );
    return settled;
  }
}

export function createPaymentService(): PaymentService {
  return new PaymentService();
}

export async function getPaymentAttempt(id: string) {
  return getPaymentAttemptById(id);
}
