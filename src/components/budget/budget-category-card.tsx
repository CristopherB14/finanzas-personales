"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BudgetLimitEditor,
  BudgetProgressSummary,
  BudgetSubcategoryRow,
} from "@/components/budget/budget-limit-editor";
import { budgetUsagePercent } from "@/lib/finance/calculations";
import type { Category } from "@/types/database";
import type { CategoryBudgetConfig, SubcategoryBudgetConfig } from "@/types/budget";
import { cn } from "@/lib/utils";

interface BudgetCategoryCardProps {
  categoryName: string;
  config: CategoryBudgetConfig;
  limitCents: number;
  spentCents: number;
  monthlyIncomeCents: number;
  subcategories: Category[];
  subcategoryConfigs: Record<string, SubcategoryBudgetConfig>;
  subcategoryLimits: Record<string, number>;
  spentBySubcategory: Record<string, number>;
  subcategoryPercentageTotal: number;
  spentLabel?: string;
  onUpdate: (config: CategoryBudgetConfig) => void;
  onUpdateSubcategory: (
    subcategoryId: string,
    config: SubcategoryBudgetConfig
  ) => void;
}

export function BudgetCategoryCard({
  categoryName,
  config,
  limitCents,
  spentCents,
  monthlyIncomeCents,
  subcategories,
  subcategoryConfigs,
  subcategoryLimits,
  spentBySubcategory,
  subcategoryPercentageTotal,
  spentLabel = "gastado",
  onUpdate,
  onUpdateSubcategory,
}: BudgetCategoryCardProps) {
  const pct = budgetUsagePercent(spentCents, limitCents);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{categoryName}</span>
          <span
            className={cn(
              "text-xs font-normal",
              pct < 80 && "text-emerald-700 dark:text-emerald-400",
              pct >= 80 && pct <= 100 && "text-amber-700 dark:text-amber-400",
              pct > 100 && "text-red-700 dark:text-red-400"
            )}
          >
            {pct.toFixed(0)}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <BudgetLimitEditor
          idPrefix={categoryName}
          config={config}
          limitCents={limitCents}
          referenceCents={monthlyIncomeCents}
          referenceLabel="ingreso mensual"
          percentageHint="Porcentaje del ingreso mensual"
          onUpdate={onUpdate}
        />

        <BudgetProgressSummary
          name={categoryName}
          limitCents={limitCents}
          spentCents={spentCents}
          spentLabel={spentLabel}
        />

        {subcategories.length > 0 && (
          <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Subcategorías
            </p>
            {subcategories.map((sub) => {
              const subConfig =
                subcategoryConfigs[sub.id] ?? {
                  mode: "fixed" as const,
                  fixedCents: 0,
                  percentage: 0,
                };

              return (
                <BudgetSubcategoryRow
                  key={`${sub.id}-${subConfig.mode}-${subConfig.fixedCents}-${subConfig.percentage}`}
                  subcategoryName={sub.name}
                  config={subConfig}
                  limitCents={subcategoryLimits[sub.id] ?? 0}
                  spentCents={spentBySubcategory[sub.id] ?? 0}
                  spentLabel={spentLabel}
                  categoryLimitCents={limitCents}
                  categoryName={categoryName}
                  percentageTotal={subcategoryPercentageTotal}
                  onUpdate={(nextConfig) =>
                    onUpdateSubcategory(sub.id, nextConfig)
                  }
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
