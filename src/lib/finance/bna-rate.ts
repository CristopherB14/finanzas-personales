import {
  formatExchangeRate,
  parseExchangeRateInput,
  type CurrencyCode,
} from "@/lib/finance/currency";

export type BnaUsdRate = {
  currency: CurrencyCode;
  /** ARS per 1 USD — BNA Cotización Billetes "Venta". */
  rate: number;
  compra: number | null;
  venta: number;
  asOf: string | null;
  source: "bna";
};

const BNA_PERSONAS_URL = "https://www.bna.com.ar/Personas";
const DOLARAPI_OFICIAL_URL = "https://dolarapi.com/v1/dolares/oficial";

function parseArgentineNumber(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized = cleaned;
  if (hasComma && hasDot) {
    // 1.510,00 → thousand sep dot, decimal comma
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // 1510,00
    normalized = cleaned.replace(",", ".");
  } else if (hasDot) {
    // 1479.0000 or 1.510 — if >1 decimal group treat as decimal
    const parts = cleaned.split(".");
    if (parts.length === 2 && parts[1].length <= 4) {
      normalized = cleaned;
    } else {
      normalized = cleaned.replace(/\./g, "");
    }
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function extractBilletesUsdVentaFromHtml(html: string): {
  compra: number | null;
  venta: number;
} | null {
  // Only accept Cotización Billetes — never Divisas.
  const billetesSection =
    html.match(
      /id=["']billetes["'][\s\S]*?(?=id=["']divisas["']|$)/i
    )?.[0] ??
    html.match(
      /Cotizaci[oó]n\s+Billetes[\s\S]*?(?=Cotizaci[oó]n\s+Divisas|$)/i
    )?.[0];

  if (!billetesSection) return null;

  const rowMatch =
    billetesSection.match(
      /Dolar\s+U\.?S\.?A\.?[\s\S]*?<td[^>]*>\s*([\d.,]+)\s*<\/td>\s*<td[^>]*>\s*([\d.,]+)\s*<\/td>/i
    ) ??
    billetesSection.match(
      /D[oó]lar\s+U\.?S\.?A\.?[^0-9]*([\d.,]+)[^0-9]+([\d.,]+)/i
    );

  if (!rowMatch) return null;

  const compra = parseArgentineNumber(rowMatch[1]);
  const venta = parseArgentineNumber(rowMatch[2]);
  if (venta == null) return null;
  return { compra, venta };
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FinanzasPersonales/1.0; +local)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: BNA_PERSONAS_URL,
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function fetchFromBnaPersonas(): Promise<BnaUsdRate | null> {
  const html = await fetchText(BNA_PERSONAS_URL);
  if (!html) return null;
  const parsed = extractBilletesUsdVentaFromHtml(html);
  if (!parsed) return null;
  return {
    currency: "USD",
    rate: parsed.venta,
    compra: parsed.compra,
    venta: parsed.venta,
    asOf: null,
    source: "bna",
  };
}

/**
 * dolarapi "oficial" mirrors BNA Cotización Billetes (compra/venta).
 * Used when the Personas page is bot-protected or missing the billetes table.
 */
async function fetchFromDolarApiMirror(): Promise<BnaUsdRate | null> {
  try {
    const response = await fetch(DOLARAPI_OFICIAL_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      compra?: number;
      venta?: number;
      fechaActualizacion?: string;
      casa?: string;
    };
    if (typeof data.venta !== "number" || !(data.venta > 0)) return null;
    return {
      currency: "USD",
      rate: data.venta,
      compra: typeof data.compra === "number" ? data.compra : null,
      venta: data.venta,
      asOf: data.fechaActualizacion ?? null,
      source: "bna",
    };
  } catch {
    return null;
  }
}

export async function fetchBnaUsdVentaRate(): Promise<BnaUsdRate> {
  // Prefer dolarapi oficial (BNA billetes venta) first — Personas is often
  // bot-protected and Cotizador/MonedasHistorico returns Divisas, not Billetes.
  const fromMirror = await fetchFromDolarApiMirror();
  if (fromMirror) return fromMirror;

  const fromBna = await fetchFromBnaPersonas();
  if (fromBna) return fromBna;

  throw new Error(
    "No se pudo obtener la cotización BNA. Ingresá el tipo de cambio manualmente."
  );
}

export function exchangeRateInputFromBna(rate: number): string {
  return formatExchangeRate(rate).replace(/\./g, "").replace(",", ".");
}

export function validateManualExchangeRate(value: string): number | null {
  return parseExchangeRateInput(value);
}
