"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface BudgetCategoryCardProps {
  categoryName: string;
  config: CategoryBudgetConfig;
  limitCents: number;
  spentCents: number;
  monthlyIncomeCents: number;
  onUpdate: (config: CategoryBudgetConfig) => void;
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

export function BudgetCategoryCard({
  categoryName,
  config,
  limitCents,
  spentCents,
  monthlyIncomeCents,
  onUpdate,
}: BudgetCategoryCardProps) {
  const [fixedInput, setFixedInput] = useState(() =>
    formatFixedInput(config.fixedCents)
  );
  const [percentageInput, setPercentageInput] = useState(() =>
    config.percentage > 0 ? String(config.percentage) : ""
  );

  const pct = budgetUsagePercent(spentCents, limitCents);
  const light = budgetTrafficLight(pct);
  const remainingCents = limitCents - spentCents;

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{categoryName}</span>
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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Modo de presupuesto</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("fixed")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
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
                config.mode === "percentage"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800"
              )}
            >
              % del ingreso
            </button>
          </div>
        </div>

        {config.mode === "fixed" ? (
          <div className="space-y-2">
            <Label htmlFor={`fixed-${categoryName}`}>Monto mensual</Label>
            <Input
              id={`fixed-${categoryName}`}
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
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`pct-${categoryName}`}>
              Porcentaje del ingreso mensual
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`pct-${categoryName}`}
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
                className="max-w-[120px]"
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
            <p className="text-xs text-slate-500">
              {config.percentage > 0 && monthlyIncomeCents > 0
                ? `${config.percentage}% de ${formatMoney(monthlyIncomeCents)} = ${formatMoney(limitCents)}`
                : monthlyIncomeCents <= 0
                  ? "Registrá ingresos este mes para calcular el monto."
                  : "Ingresá un porcentaje para calcular el monto."}
            </p>
          </div>
        )}

        <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
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
          <div className="grid gap-1 text-sm text-slate-500 sm:grid-cols-3">
            <p>
              <span className="text-slate-400">Asignado: </span>
              {formatMoney(limitCents)}
            </p>
            <p>
              <span className="text-slate-400">Gastado: </span>
              {formatMoney(spentCents)}
            </p>
            <p>
              <span className="text-slate-400">Restante: </span>
              <span
                className={cn(
                  remainingCents < 0 && "font-medium text-red-600",
                  remainingCents >= 0 && remainingCents <= limitCents * 0.2 &&
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
              Estás cerca del límite en {categoryName}.
            </p>
          )}
          {pct >= 100 && limitCents > 0 && (
            <p className="text-xs text-red-700">
              Superaste el presupuesto de {categoryName}.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
