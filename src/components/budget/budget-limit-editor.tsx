"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, parseMoneyInput } from "@/lib/format";
import {
  budgetTrafficLight,
  budgetUsagePercent,
} from "@/lib/finance/calculations";
import type { CategoryBudgetConfig, BudgetLimitMode } from "@/types/budget";
import { cn } from "@/lib/utils";

interface BudgetLimitEditorProps {
  idPrefix: string;
  config: CategoryBudgetConfig;
  limitCents: number;
  referenceCents: number;
  referenceLabel: string;
  percentageHint?: string;
  onUpdate: (config: CategoryBudgetConfig) => void;
  percentageTotal?: number;
  compact?: boolean;
}

function formatFixedInput(cents: number): string {
  if (cents <= 0) return "";
  return String(cents / 100);
}

function parsePercentageInput(value: string): number {
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const num = parseFloat(normalized);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, num));
}

export function BudgetLimitEditor({
  idPrefix,
  config,
  limitCents,
  referenceCents,
  referenceLabel,
  percentageHint,
  onUpdate,
  percentageTotal,
  compact = false,
}: BudgetLimitEditorProps) {
  const [fixedInput, setFixedInput] = useState(() =>
    formatFixedInput(config.fixedCents)
  );
  const [percentageInput, setPercentageInput] = useState(() =>
    config.percentage > 0 ? String(config.percentage) : ""
  );

  const setMode = (mode: BudgetLimitMode) => {
    if (mode === config.mode) return;
    onUpdate({ ...config, mode });
  };

  const commitFixedInput = () => {
    const fixedCents = parseMoneyInput(fixedInput);
    if (fixedCents === config.fixedCents && config.mode === "fixed") return;
    onUpdate({ ...config, mode: "fixed", fixedCents });
  };

  const commitPercentageInput = () => {
    const percentage = parsePercentageInput(percentageInput);
    if (percentage === config.percentage && config.mode === "percentage") {
      return;
    }
    onUpdate({ ...config, mode: "percentage", percentage });
  };

  const percentageOverLimit =
    percentageTotal !== undefined && percentageTotal > 100;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="space-y-2">
        <Label className={compact ? "text-xs" : undefined}>
          Modo de presupuesto
        </Label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("fixed")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              compact && "px-3 py-1.5 text-xs",
              config.mode === "fixed"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800"
            )}
          >
            Monto fijo
          </button>
          <button
            type="button"
            onClick={() => setMode("percentage")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              compact && "px-3 py-1.5 text-xs",
              config.mode === "percentage"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800"
            )}
          >
            Porcentaje
          </button>
        </div>
      </div>

      {config.mode === "fixed" ? (
        <div className="space-y-2">
          <Label htmlFor={`fixed-${idPrefix}`} className={compact ? "text-xs" : undefined}>
            Monto
          </Label>
          <Input
            id={`fixed-${idPrefix}`}
            inputMode="decimal"
            placeholder="$ 0"
            value={fixedInput}
            onChange={(e) => setFixedInput(e.target.value)}
            onBlur={commitFixedInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitFixedInput();
              }
            }}
            className={compact ? "h-9" : undefined}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={`pct-${idPrefix}`} className={compact ? "text-xs" : undefined}>
            {percentageHint ?? "Porcentaje"}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`pct-${idPrefix}`}
              inputMode="decimal"
              placeholder="0"
              value={percentageInput}
              onChange={(e) => setPercentageInput(e.target.value)}
              onBlur={commitPercentageInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitPercentageInput();
                }
              }}
              className={cn("max-w-[120px]", compact && "h-9 max-w-[100px]")}
            />
            <span className="text-sm text-slate-500">%</span>
          </div>
          <p className="text-xs text-slate-500">
            {config.percentage > 0 && referenceCents > 0
              ? `${config.percentage}% de ${formatMoney(referenceCents)} = ${formatMoney(limitCents)}`
              : referenceCents <= 0
                ? `Definí el presupuesto de ${referenceLabel} primero.`
                : "Ingresá un porcentaje para calcular el monto."}
          </p>
          {percentageOverLimit && (
            <p className="text-xs text-amber-700">
              La suma de porcentajes ({percentageTotal?.toFixed(0)}%) supera el
              100%. Ajustá los valores.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface BudgetProgressSummaryProps {
  name: string;
  limitCents: number;
  spentCents: number;
  spentLabel?: string;
  compact?: boolean;
}

export function BudgetProgressSummary({
  name,
  limitCents,
  spentCents,
  spentLabel = "Gastado",
  compact = false,
}: BudgetProgressSummaryProps) {
  const pct = budgetUsagePercent(spentCents, limitCents);
  const light = budgetTrafficLight(pct);
  const remainingCents = limitCents - spentCents;

  return (
    <div className={cn("space-y-2", compact ? "pt-2" : "border-t border-slate-100 pt-4 dark:border-slate-800")}>
      <div className="flex items-center justify-between">
        {!compact && <span className="text-sm font-medium">{name}</span>}
        <span
          className={cn(
            "text-xs font-normal",
            light === "green" && "text-emerald-600",
            light === "yellow" && "text-amber-600",
            light === "red" && "text-red-600"
          )}
        >
          {pct.toFixed(0)}%
        </span>
      </div>
      <Progress
        value={Math.min(100, pct)}
        indicatorClassName={
          light === "red"
            ? "bg-red-500"
            : light === "yellow"
              ? "bg-amber-500"
              : undefined
        }
      />
      <div className={cn("grid gap-1 text-sm text-slate-500", compact ? "grid-cols-1 sm:grid-cols-3" : "sm:grid-cols-3")}>
        <p>
          <span className="text-slate-400">Asignado: </span>
          {formatMoney(limitCents)}
        </p>
        <p>
          <span className="text-slate-400">{spentLabel}: </span>
          {formatMoney(spentCents)}
        </p>
        <p>
          <span className="text-slate-400">Restante: </span>
          <span
            className={cn(
              remainingCents < 0 && "font-medium text-red-600",
              remainingCents >= 0 &&
                remainingCents <= limitCents * 0.2 &&
                limitCents > 0 &&
                "font-medium text-amber-600"
            )}
          >
            {formatMoney(remainingCents)}
          </span>
        </p>
      </div>
      {pct >= 80 && pct < 100 && (
        <p className="text-xs text-amber-700">
          Estás cerca del límite en {name}.
        </p>
      )}
      {pct >= 100 && limitCents > 0 && (
        <p className="text-xs text-red-700">
          Superaste el presupuesto de {name}.
        </p>
      )}
    </div>
  );
}

export function BudgetSubcategoryRow({
  subcategoryName,
  config,
  limitCents,
  spentCents,
  categoryLimitCents,
  categoryName,
  percentageTotal,
  spentLabel = "Gastado",
  onUpdate,
}: {
  subcategoryName: string;
  config: CategoryBudgetConfig;
  limitCents: number;
  spentCents: number;
  categoryLimitCents: number;
  categoryName: string;
  percentageTotal: number;
  spentLabel?: string;
  onUpdate: (config: CategoryBudgetConfig) => void;
}) {
  return (
    <Card className="border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/50">
      <div className="space-y-3 p-4">
        <p className="text-sm font-medium">{subcategoryName}</p>
        <BudgetLimitEditor
          idPrefix={subcategoryName}
          config={config}
          limitCents={limitCents}
          referenceCents={categoryLimitCents}
          referenceLabel={categoryName}
          percentageHint={`Porcentaje del presupuesto de ${categoryName}`}
          percentageTotal={percentageTotal}
          onUpdate={onUpdate}
          compact
        />
        <BudgetProgressSummary
          name={subcategoryName}
          limitCents={limitCents}
          spentCents={spentCents}
          spentLabel={spentLabel}
          compact
        />
      </div>
    </Card>
  );
}
