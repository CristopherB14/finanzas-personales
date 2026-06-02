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
