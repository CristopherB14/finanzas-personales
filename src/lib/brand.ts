/**
 * Central brand constants — single source of truth for naming and SEO copy.
 * Technical IDs (IndexedDB name, package name) are intentionally unchanged.
 */

export const BRAND_NAME = "Klaro";
export const BRAND_TAGLINE = "Tu dinero, claro";
export const BRAND_DESCRIPTION =
  "Administrá ingresos, gastos, presupuesto e inversiones con claridad. Funciona sin internet y se sincroniza cuando volvés a conectarte.";

export const BRAND_SHORT_DESCRIPTION =
  "Finanzas personales simples, visuales y offline-first.";

/** Public site URL for canonical links and Open Graph. */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  return url || "http://localhost:3000";
}

export const BRAND_KEYWORDS = [
  "finanzas personales",
  "presupuesto",
  "control de gastos",
  "ahorro",
  "ingresos",
  "PWA",
  "offline",
];
