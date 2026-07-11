/**
 * Mercado Pago URL helpers.
 *
 * Official rules (Checkout Pro back_urls):
 * - HTTPS is mandatory
 * - Do NOT use localhost / 127.0.0.1 (with or without port)
 * - auto_return requires a valid back_urls.success
 *
 * @see https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/configure-back-urls
 */

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

export type MercadoPagoBackUrls = {
  success: string;
  pending: string;
  failure: string;
};

/** True when Mercado Pago will accept the URL for back_urls / notification_url. */
export function isMercadoPagoPublicUrl(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== "string") return false;

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (LOCAL_HOSTS.has(host)) return false;
  if (host.endsWith(".localhost")) return false;
  if (host.endsWith(".local")) return false;

  // Block obvious private IPv4 ranges (MP needs a reachable public host).
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return false;

  return true;
}

function normalizeOrigin(raw: string): string {
  return raw.replace(/\/$/, "").trim();
}

/**
 * Prefer NEXT_PUBLIC_APP_URL when set (production domain or HTTPS tunnel).
 * Fall back to the request origin (useful when APP_URL is unset in prod).
 */
export function resolveAppOrigin(requestOrigin: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return normalizeOrigin(configured);
  return normalizeOrigin(requestOrigin);
}

/**
 * Origin that Mercado Pago will accept for back_urls / notification_url.
 * Returns null on localhost / http — callers must omit those fields.
 */
export function resolveMercadoPagoPublicOrigin(
  requestOrigin: string
): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && isMercadoPagoPublicUrl(configured)) {
    return normalizeOrigin(configured);
  }

  const fromRequest = normalizeOrigin(requestOrigin);
  if (isMercadoPagoPublicUrl(fromRequest)) {
    return fromRequest;
  }

  return null;
}

export function buildMercadoPagoBackUrls(
  publicOrigin: string,
  attemptId: string
): MercadoPagoBackUrls {
  const base = `${normalizeOrigin(publicOrigin)}/pagos/resultado`;
  const id = encodeURIComponent(attemptId);
  return {
    success: `${base}?attempt_id=${id}&status=success`,
    pending: `${base}?attempt_id=${id}&status=pending`,
    failure: `${base}?attempt_id=${id}&status=failure`,
  };
}

export function buildMercadoPagoNotificationUrl(publicOrigin: string): string {
  return `${normalizeOrigin(publicOrigin)}/api/payments/mercadopago/webhook`;
}

/**
 * auto_return may only be sent when back_urls.success is a valid public HTTPS URL.
 */
export function resolveAutoReturn(
  backUrls: MercadoPagoBackUrls | null | undefined
): "approved" | undefined {
  if (!backUrls?.success) return undefined;
  if (!isMercadoPagoPublicUrl(backUrls.success)) return undefined;
  return "approved";
}
