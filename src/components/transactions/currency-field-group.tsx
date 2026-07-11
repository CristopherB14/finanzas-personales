"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { choicePill, errorText, metaText } from "@/lib/a11y";
import {
  formatExchangeRate,
  needsExchangeRate,
  type CurrencyCode,
  type ExchangeRateSource,
} from "@/lib/finance/currency";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type CurrencyFieldGroupProps = {
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  accountCurrency: CurrencyCode | null;
  exchangeRate: string;
  onExchangeRateChange: (value: string) => void;
  exchangeRateSource: ExchangeRateSource | null;
  onExchangeRateSourceChange: (source: ExchangeRateSource) => void;
  originalAmountCents?: number;
  /** Optional second account currency (transfers). */
  destinationCurrency?: CurrencyCode | null;
  /** Override auto detection (e.g. transfers when source ≠ destination). */
  requiresConversion?: boolean;
  convertedPreviewLabel?: string;
  disabled?: boolean;
};

export function CurrencyFieldGroup({
  currency,
  onCurrencyChange,
  accountCurrency,
  exchangeRate,
  onExchangeRateChange,
  exchangeRateSource,
  onExchangeRateSourceChange,
  originalAmountCents = 0,
  destinationCurrency = null,
  requiresConversion,
  convertedPreviewLabel,
  disabled = false,
}: CurrencyFieldGroupProps) {
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [bnaRate, setBnaRate] = useState<number | null>(null);
  const fetchedForKey = useRef<string | null>(null);

  const conversionTarget = destinationCurrency ?? accountCurrency;
  const requiresRate =
    requiresConversion ??
    (Boolean(conversionTarget) &&
      needsExchangeRate(currency, conversionTarget as CurrencyCode));

  useEffect(() => {
    if (!requiresRate || disabled) return;

    const key = `${currency}:${conversionTarget}`;
    if (fetchedForKey.current === key && bnaRate != null) return;

    let cancelled = false;
    fetchedForKey.current = key;
    setLoadingRate(true);
    setRateError(null);

    void fetch("/api/exchange-rate/bna")
      .then(async (response) => {
        const data = (await response.json()) as {
          rate?: number;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo obtener la cotización BNA.");
        }
        if (cancelled) return;
        if (typeof data.rate !== "number" || !(data.rate > 0)) {
          throw new Error("Cotización BNA inválida.");
        }
        setBnaRate(data.rate);
        if (exchangeRateSource !== "manual" || !exchangeRate.trim()) {
          onExchangeRateChange(String(data.rate));
          onExchangeRateSourceChange("bna");
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRateError(
          error instanceof Error
            ? error.message
            : "No se pudo obtener la cotización BNA."
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingRate(false);
      });

    return () => {
      cancelled = true;
    };
    // Intentionally omit exchangeRate handlers to avoid refetch loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresRate, currency, conversionTarget, disabled]);

  const parsedRate = Number(exchangeRate.replace(",", "."));
  const showPreview =
    requiresRate &&
    originalAmountCents > 0 &&
    Number.isFinite(parsedRate) &&
    parsedRate > 0 &&
    conversionTarget;

  let previewCents: number | null = null;
  if (showPreview && conversionTarget) {
    previewCents =
      currency === "USD" && conversionTarget === "ARS"
        ? Math.round(originalAmountCents * parsedRate)
        : currency === "ARS" && conversionTarget === "USD"
          ? Math.round(originalAmountCents / parsedRate)
          : null;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Moneda</Label>
        <div className="flex gap-2">
          {(["ARS", "USD"] as const).map((code) => (
            <button
              key={code}
              type="button"
              disabled={disabled}
              className={choicePill(currency === code)}
              onClick={() => onCurrencyChange(code)}
            >
              {code}
            </button>
          ))}
        </div>
        {accountCurrency && !destinationCurrency && (
          <p className={metaText}>
            Cuenta en {accountCurrency}
            {requiresRate
              ? " — se requiere tipo de cambio."
              : " — sin conversión."}
          </p>
        )}
      </div>

      {requiresRate && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="exchange-rate">Tipo de cambio (ARS por USD)</Label>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={disabled || loadingRate || bnaRate == null}
                className={cn(choicePill(exchangeRateSource === "bna", true))}
                onClick={() => {
                  if (bnaRate == null) return;
                  onExchangeRateChange(String(bnaRate));
                  onExchangeRateSourceChange("bna");
                  setRateError(null);
                }}
              >
                {loadingRate ? "BNA…" : "Usar BNA"}
              </button>
              <button
                type="button"
                disabled={disabled}
                className={cn(choicePill(exchangeRateSource === "manual", true))}
                onClick={() => onExchangeRateSourceChange("manual")}
              >
                Manual
              </button>
            </div>
          </div>
          <Input
            id="exchange-rate"
            inputMode="decimal"
            placeholder="Ej: 1510"
            value={exchangeRate}
            disabled={disabled}
            onChange={(e) => {
              onExchangeRateChange(e.target.value);
              onExchangeRateSourceChange("manual");
            }}
          />
          {bnaRate != null && (
            <p className={metaText}>
              Cotización BNA billetes (venta): {formatExchangeRate(bnaRate)}
            </p>
          )}
          {previewCents != null && conversionTarget && (
            <p className={metaText}>
              {convertedPreviewLabel ?? "Impacto en cuenta"}:{" "}
              {formatMoney(previewCents, conversionTarget)}
            </p>
          )}
          {rateError && <p className={errorText}>{rateError}</p>}
        </div>
      )}
    </div>
  );
}
