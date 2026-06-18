export type BudgetLimitMode = "fixed" | "percentage";

export interface CategoryBudgetConfig {
  mode: BudgetLimitMode;
  fixedCents: number;
  percentage: number;
}

export interface BudgetSettings {
  version: 1;
  categories: Record<string, CategoryBudgetConfig>;
}

export const BUDGET_PREFERENCES_KEY = "budget";

export function createEmptyCategoryBudgetConfig(): CategoryBudgetConfig {
  return { mode: "fixed", fixedCents: 0, percentage: 0 };
}
