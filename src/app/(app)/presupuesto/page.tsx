"use client";

import { BudgetCategoryCard } from "@/components/budget/budget-category-card";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useBudget } from "@/hooks/use-budget";
import { formatMoney } from "@/lib/format";
import { createEmptyCategoryBudgetConfig } from "@/types/budget";

export default function PresupuestoPage() {
  const { user } = useUser();
  const { transactions } = useTransactions(user?.id);
  const {
    categories,
    settings,
    limits,
    spentByCategory,
    monthlyIncomeCents,
    hasPercentageCategories,
    loading,
    updateCategoryBudget,
  } = useBudget(user?.id, transactions);

  if (loading) {
    return <p className="text-slate-500">Cargando presupuesto…</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Presupuesto</h1>
        <p className="text-sm text-slate-500">
          Configurá cuánto querés gastar por categoría y compará con lo que ya
          gastaste este mes.
        </p>
      </header>

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
            settings?.categories[category.id] ?? createEmptyCategoryBudgetConfig();

          return (
            <BudgetCategoryCard
              key={`${category.id}-${config.mode}-${config.fixedCents}-${config.percentage}`}
              categoryName={category.name}
              config={config}
              limitCents={limits[category.id] ?? 0}
              spentCents={spentByCategory[category.id] ?? 0}
              monthlyIncomeCents={monthlyIncomeCents}
              onUpdate={(nextConfig) =>
                void updateCategoryBudget(category.id, nextConfig)
              }
            />
          );
        })}
      </div>
    </div>
  );
}
