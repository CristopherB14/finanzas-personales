/**
 * Mercado Pago credentials — server-only.
 * Never import this module from client components.
 */

export function getMercadoPagoAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN");
  }
  if (typeof window !== "undefined") {
    throw new Error("Mercado Pago credentials must only be used on the server");
  }
  return token;
}

export function getMercadoPagoPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? null;
}

export function getMercadoPagoWebhookSecret(): string | null {
  return process.env.MERCADOPAGO_WEBHOOK_SECRET ?? null;
}

/**
 * Prefer explicit flag; fall back to detecting test Access Tokens.
 * Test credentials still start with APP_USR- but sandbox_init_point must be used.
 */
export function isMercadoPagoSandbox(): boolean {
  const flag = process.env.MERCADOPAGO_ENV?.toLowerCase();
  if (flag === "sandbox" || flag === "test") return true;
  if (flag === "production" || flag === "prod") return false;
  // Default: treat as sandbox unless explicitly production.
  return true;
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}
