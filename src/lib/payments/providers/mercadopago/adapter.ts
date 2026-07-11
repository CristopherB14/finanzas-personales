import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CreatePreferenceParams,
  CreatePreferenceResult,
  PaymentAdapter,
  PaymentAttemptStatus,
  ProviderPaymentStatus,
} from "@/lib/payments/types";
import {
  getMercadoPagoAccessToken,
  getMercadoPagoWebhookSecret,
  isMercadoPagoSandbox,
} from "@/lib/payments/providers/mercadopago/config";
import {
  isMercadoPagoPublicUrl,
  resolveAutoReturn,
} from "@/lib/payments/providers/mercadopago/urls";

const MP_API_BASE = "https://api.mercadopago.com";

function mapMpStatus(status: string | undefined): PaymentAttemptStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "in_process":
    case "in_mediation":
    case "pending":
    case "authorized":
      return "in_process";
    default:
      return "in_process";
  }
}

function mpErrorMessage(body: unknown, status: number): string {
  if (!body || typeof body !== "object") {
    return `Mercado Pago API error (${status})`;
  }

  const record = body as {
    message?: unknown;
    error?: unknown;
    cause?: Array<{ description?: string; code?: string }>;
  };

  const causes = Array.isArray(record.cause)
    ? record.cause
        .map((c) => c.description || c.code)
        .filter(Boolean)
        .join("; ")
    : "";

  const message =
    typeof record.message === "string"
      ? record.message
      : typeof record.error === "string"
        ? record.error
        : `Mercado Pago API error (${status})`;

  return causes ? `${message} (${causes})` : message;
}

async function mpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = getMercadoPagoAccessToken();
  const response = await fetch(`${MP_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    throw new Error(mpErrorMessage(body, response.status));
  }

  return body as T;
}

type MpPreferenceResponse = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

type MpPaymentResponse = {
  id: number | string;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
  preference_id?: string;
  date_approved?: string | null;
};

/**
 * Official Checkout Pro adapter:
 * - POST /checkout/preferences
 * - GET /v1/payments/{id}
 * - Webhook x-signature HMAC validation
 */
export class MercadoPagoAdapter implements PaymentAdapter {
  readonly providerId = "mercadopago" as const;

  async createPreference(
    params: CreatePreferenceParams
  ): Promise<CreatePreferenceResult> {
    // unit_price is decimal major units (ARS pesos), not cents.
    const unitPrice = Number((params.amountCents / 100).toFixed(2));

    const backUrls =
      params.backUrls &&
      isMercadoPagoPublicUrl(params.backUrls.success) &&
      isMercadoPagoPublicUrl(params.backUrls.pending) &&
      isMercadoPagoPublicUrl(params.backUrls.failure)
        ? {
            success: params.backUrls.success,
            pending: params.backUrls.pending,
            failure: params.backUrls.failure,
          }
        : null;

    // Never send auto_return without a valid back_urls.success.
    const autoReturn = resolveAutoReturn(backUrls);

    const notificationUrl =
      params.notificationUrl &&
      isMercadoPagoPublicUrl(params.notificationUrl)
        ? params.notificationUrl
        : null;

    const payload: Record<string, unknown> = {
      items: [
        {
          id: params.externalReference.slice(0, 64),
          title: params.title.slice(0, 256),
          quantity: 1,
          unit_price: unitPrice,
          currency_id: params.currencyCode,
        },
      ],
      external_reference: params.externalReference,
      metadata: params.metadata ?? {},
    };

    if (backUrls) {
      payload.back_urls = backUrls;
    }
    if (autoReturn && backUrls?.success) {
      payload.auto_return = autoReturn;
    }
    if (notificationUrl) {
      payload.notification_url = notificationUrl;
    }
    if (params.payerEmail) {
      payload.payer = { email: params.payerEmail };
    }

    const data = await mpFetch<MpPreferenceResponse>("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const sandbox = isMercadoPagoSandbox();
    const checkoutUrl = sandbox
      ? data.sandbox_init_point ?? data.init_point
      : data.init_point ?? data.sandbox_init_point;

    if (!checkoutUrl) {
      throw new Error("Mercado Pago preference missing checkout URL");
    }

    return {
      preferenceId: data.id,
      checkoutUrl,
      sandboxCheckoutUrl: data.sandbox_init_point ?? null,
      raw: data,
    };
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPaymentStatus> {
    const data = await mpFetch<MpPaymentResponse>(
      `/v1/payments/${encodeURIComponent(providerPaymentId)}`
    );

    const amountMajor =
      typeof data.transaction_amount === "number"
        ? data.transaction_amount
        : 0;

    return {
      providerPaymentId: String(data.id),
      status: mapMpStatus(data.status),
      statusDetail: data.status_detail ?? null,
      amountCents: Math.round(amountMajor * 100),
      currencyCode: data.currency_id ?? "ARS",
      externalReference: data.external_reference ?? null,
      preferenceId: data.preference_id ?? null,
      paidAt: data.date_approved ?? null,
      raw: data,
    };
  }

  verifyWebhookSignature(input: {
    xSignature: string | null;
    xRequestId: string | null;
    dataId: string | null;
  }): boolean {
    const secret = getMercadoPagoWebhookSecret();
    if (!secret) {
      return false;
    }

    if (!input.xSignature) return false;

    const parts = Object.fromEntries(
      input.xSignature.split(",").map((part) => {
        const [k, ...rest] = part.trim().split("=");
        return [k, rest.join("=")];
      })
    );

    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) return false;

    const dataId = input.dataId?.toLowerCase() ?? null;
    const manifestParts: string[] = [];
    if (dataId) manifestParts.push(`id:${dataId}`);
    if (input.xRequestId) manifestParts.push(`request-id:${input.xRequestId}`);
    manifestParts.push(`ts:${ts}`);
    const manifest = `${manifestParts.join(";")};`;

    const expected = createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");

    try {
      const a = Buffer.from(expected, "utf8");
      const b = Buffer.from(v1, "utf8");
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}

export function createMercadoPagoAdapter(): MercadoPagoAdapter {
  return new MercadoPagoAdapter();
}
