export const SUPPORTED_CURRENCIES = ["ARS", "USD"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export type ExchangeRateSource = "bna" | "manual";

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function normalizeCurrencyCode(
  value: string | null | undefined
): CurrencyCode {
  if (value && isCurrencyCode(value)) return value;
  return "ARS";
}

/** Exchange rate is always expressed as ARS per 1 USD (BNA billetes venta). */
export function parseExchangeRateInput(value: string): number | null {
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!normalized) return null;
  const rate = Number(normalized);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return rate;
}

export function formatExchangeRate(rate: number): string {
  return rate.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function needsExchangeRate(
  movementCurrency: CurrencyCode,
  accountCurrency: CurrencyCode
): boolean {
  return movementCurrency !== accountCurrency;
}

/**
 * Convert cents between ARS and USD using ARS-per-USD rate.
 * Uses integer cents + Math.round to avoid float storage errors.
 */
export function convertCents(params: {
  amountCents: number;
  from: CurrencyCode;
  to: CurrencyCode;
  exchangeRate: number;
}): number {
  const { amountCents, from, to, exchangeRate } = params;

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("El monto debe ser un entero positivo en centavos.");
  }
  if (!isCurrencyCode(from) || !isCurrencyCode(to)) {
    throw new Error("Moneda inválida.");
  }
  if (from === to) return amountCents;
  if (!(exchangeRate > 0) || !Number.isFinite(exchangeRate)) {
    throw new Error("El tipo de cambio debe ser mayor a 0.");
  }

  if (from === "USD" && to === "ARS") {
    return Math.round(amountCents * exchangeRate);
  }
  if (from === "ARS" && to === "USD") {
    return Math.round(amountCents / exchangeRate);
  }

  throw new Error("Conversión no soportada.");
}

export type ResolvedMoneyMovement = {
  currency_code: CurrencyCode;
  original_amount_cents: number;
  /** Amount applied to the primary/source account (account currency). */
  amount_cents: number;
  converted_amount_cents: number | null;
  exchange_rate: number | null;
  exchange_rate_source: ExchangeRateSource | null;
};

export function resolveMovementAmounts(params: {
  originalAmountCents: number;
  movementCurrency: string;
  accountCurrency: string;
  exchangeRate?: number | null;
  exchangeRateSource?: ExchangeRateSource | null;
}): ResolvedMoneyMovement {
  const movementCurrency = normalizeCurrencyCode(params.movementCurrency);
  const accountCurrency = normalizeCurrencyCode(params.accountCurrency);
  const originalAmountCents = params.originalAmountCents;

  if (!Number.isInteger(originalAmountCents) || originalAmountCents <= 0) {
    throw new Error("Ingresá un monto válido.");
  }
  if (
    !isCurrencyCode(params.movementCurrency) ||
    !isCurrencyCode(params.accountCurrency)
  ) {
    throw new Error("Moneda inválida. Usá ARS o USD.");
  }

  if (!needsExchangeRate(movementCurrency, accountCurrency)) {
    return {
      currency_code: movementCurrency,
      original_amount_cents: originalAmountCents,
      amount_cents: originalAmountCents,
      converted_amount_cents: null,
      exchange_rate: null,
      exchange_rate_source: null,
    };
  }

  const rate = params.exchangeRate;
  if (rate == null || !(rate > 0) || !Number.isFinite(rate)) {
    throw new Error("Ingresá un tipo de cambio válido mayor a 0.");
  }

  const converted = convertCents({
    amountCents: originalAmountCents,
    from: movementCurrency,
    to: accountCurrency,
    exchangeRate: rate,
  });

  if (converted <= 0) {
    throw new Error("La conversión produjo un monto inválido.");
  }

  return {
    currency_code: movementCurrency,
    original_amount_cents: originalAmountCents,
    amount_cents: converted,
    converted_amount_cents: converted,
    exchange_rate: rate,
    exchange_rate_source: params.exchangeRateSource ?? "manual",
  };
}

export function resolveTransferAmounts(params: {
  originalAmountCents: number;
  /** Currency of the entered amount (defaults to source account currency). */
  movementCurrency: string;
  sourceCurrency: string;
  destinationCurrency: string;
  exchangeRate?: number | null;
  exchangeRateSource?: ExchangeRateSource | null;
}): ResolvedMoneyMovement & { destination_amount_cents: number } {
  const movementCurrency = normalizeCurrencyCode(params.movementCurrency);
  const sourceCurrency = normalizeCurrencyCode(params.sourceCurrency);
  const destinationCurrency = normalizeCurrencyCode(params.destinationCurrency);
  const originalAmountCents = params.originalAmountCents;

  if (!Number.isInteger(originalAmountCents) || originalAmountCents <= 0) {
    throw new Error("Ingresá un monto válido.");
  }
  if (
    !isCurrencyCode(params.movementCurrency) ||
    !isCurrencyCode(params.sourceCurrency) ||
    !isCurrencyCode(params.destinationCurrency)
  ) {
    throw new Error("Moneda inválida. Usá ARS o USD.");
  }

  const rate = params.exchangeRate;
  const sourceSameAsMovement = movementCurrency === sourceCurrency;
  const currenciesMatch = sourceCurrency === destinationCurrency;

  if (currenciesMatch) {
    if (!sourceSameAsMovement) {
      throw new Error(
        "El monto debe estar en la moneda de las cuentas cuando no hay conversión."
      );
    }
    return {
      currency_code: movementCurrency,
      original_amount_cents: originalAmountCents,
      amount_cents: originalAmountCents,
      converted_amount_cents: null,
      exchange_rate: null,
      exchange_rate_source: null,
      destination_amount_cents: originalAmountCents,
    };
  }

  if (rate == null || !(rate > 0) || !Number.isFinite(rate)) {
    throw new Error("Ingresá un tipo de cambio válido mayor a 0.");
  }

  const sourceAmountCents = sourceSameAsMovement
    ? originalAmountCents
    : convertCents({
        amountCents: originalAmountCents,
        from: movementCurrency,
        to: sourceCurrency,
        exchangeRate: rate,
      });

  const destinationAmountCents = convertCents({
    amountCents: sourceAmountCents,
    from: sourceCurrency,
    to: destinationCurrency,
    exchangeRate: rate,
  });

  if (sourceAmountCents <= 0 || destinationAmountCents <= 0) {
    throw new Error("La conversión produjo un monto inválido.");
  }

  return {
    currency_code: movementCurrency,
    original_amount_cents: originalAmountCents,
    amount_cents: sourceAmountCents,
    converted_amount_cents: destinationAmountCents,
    exchange_rate: rate,
    exchange_rate_source: params.exchangeRateSource ?? "manual",
    destination_amount_cents: destinationAmountCents,
  };
}

export function transactionDisplayAmountCents(tx: {
  amount_cents: number;
  original_amount_cents?: number | null;
}): number {
  return tx.original_amount_cents ?? tx.amount_cents;
}
