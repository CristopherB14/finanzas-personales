const defaultLocale = "es-AR";

export function formatMoney(
  cents: number,
  currency = "ARS",
  locale = defaultLocale
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Format one or more currency totals without mixing ARS/USD. */
export function formatMoneyByCurrency(
  amounts: Record<string, number>,
  locale = defaultLocale
): string {
  const parts = Object.entries(amounts)
    .filter(([, cents]) => cents !== 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, cents]) => formatMoney(cents, currency, locale));

  if (parts.length === 0) {
    const fallbackCurrency = Object.keys(amounts)[0] ?? "ARS";
    return formatMoney(0, fallbackCurrency, locale);
  }

  return parts.join(" · ");
}

export function parseMoneyInput(value: string): number {
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const num = parseFloat(normalized);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatMonthYear(year: number, month: number): string {
  return new Intl.DateTimeFormat(defaultLocale, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}
