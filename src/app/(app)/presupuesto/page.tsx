"use client";

import { useState } from "react";
import { BudgetCategoryCard } from "@/components/budget/budget-category-card";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useBudget, type BudgetCategoryKind } from "@/hooks/use-budget";
import { useCategories } from "@/hooks/use-categories";
import { sumSubcategoryPercentages } from "@/lib/budget/migration";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  createEmptyCategoryBudgetConfig,
  createEmptySubcategoryBudgetConfig,
} from "@/types/budget";

function BudgetSection({ categoryKind }: { categoryKind: BudgetCategoryKind }) {
  const { user } = useUser();
  const { transactions } = useTransactions(user?.id);
  const { getSubcategoriesFor } = useCategories(user?.id, transactions);
  const {
    categories,
    allCategories,
    settings,
    limits,
    subcategoryLimitsByCategory,
    spentByCategory,
    spentByCategoryId,
    monthlyIncomeCents,
    hasPercentageCategories,
    loading,
    updateCategoryBudget,
    updateSubcategoryBudget,
  } = useBudget(user?.id, transactions, categoryKind);

  if (loading) {
    return <p className="text-slate-500">Cargando presupuesto…</p>;
  }

  const spentLabel =
    categoryKind === "investment" ? "Invertido" : "Gastado";

  return (
    <>
      {hasPercentageCategories && (
        <Card>
          <CardContent className="py-4 text-sm text-slate-600">
            Ingreso mensual de referencia:{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {formatMoney(monthlyIncomeCents)}
            </span>
            {monthlyIncomeCents <= 0 && (
              <span className="mt-1 block text-xs text-amber-700">
                Las categorías en porcentaje se calcularán cuando registres
                ingresos este mes.
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {categories.map((category) => {
          const config =
            settings?.categories[category.id] ??
            createEmptyCategoryBudgetConfig();
          const subcategories = getSubcategoriesFor(category.id);
          const subcategoryConfigs: Record<
            string,
            ReturnType<typeof createEmptySubcategoryBudgetConfig>
          > = {};

          for (const sub of subcategories) {
            subcategoryConfigs[sub.id] =
              settings?.subcategories[sub.id] ??
              createEmptySubcategoryBudgetConfig();
          }

          const percentageTotal = settings
            ? sumSubcategoryPercentages(settings, allCategories, category.id)
            : 0;

          return (
            <BudgetCategoryCard
              key={`${categoryKind}-${category.id}-${config.mode}-${config.fixedCents}-${config.percentage}`}
              categoryName={category.name}
              config={config}
              limitCents={limits[category.id] ?? 0}
              spentCents={spentByCategory[category.id] ?? 0}
              monthlyIncomeCents={monthlyIncomeCents}
              subcategories={subcategories}
              subcategoryConfigs={subcategoryConfigs}
              subcategoryLimits={
                subcategoryLimitsByCategory[category.id] ?? {}
              }
              spentBySubcategory={spentByCategoryId}
              subcategoryPercentageTotal={percentageTotal}
              spentLabel={spentLabel}
              onUpdate={(nextConfig) =>
                void updateCategoryBudget(category.id, nextConfig)
              }
              onUpdateSubcategory={(subcategoryId, nextConfig) =>
                void updateSubcategoryBudget(subcategoryId, nextConfig)
              }
            />
          );
        })}
      </div>
    </>
  );
}

export default function PresupuestoPage() {
  const [tab, setTab] = useState<BudgetCategoryKind>("expense");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Presupuesto</h1>
        <p className="text-sm text-slate-500">
          Configurá límites para gastos e inversiones y compará con lo registrado
          este mes.
        </p>
      </header>

      <div className="flex gap-2">
        {(["expense", "investment"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setTab(kind)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === kind
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800"
            )}
          >
            {kind === "expense" ? "Gastos" : "Inversiones"}
          </button>
        ))}
      </div>

      <BudgetSection categoryKind={tab} />
    </div>
  );
}
