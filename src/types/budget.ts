export type BudgetLimitMode = "fixed" | "percentage";

export interface CategoryBudgetConfig {
  mode: BudgetLimitMode;
  fixedCents: number;
  percentage: number;
}

/** Same shape as category config; resolved against parent category limit. */
export type SubcategoryBudgetConfig = CategoryBudgetConfig;

export interface BudgetSettings {
  version: 2;
  categories: Record<string, CategoryBudgetConfig>;
  subcategories: Record<string, SubcategoryBudgetConfig>;
}

export const BUDGET_PREFERENCES_KEY = "budget";

export function createEmptyCategoryBudgetConfig(): CategoryBudgetConfig {
  return { mode: "fixed", fixedCents: 0, percentage: 0 };
}

export function createEmptySubcategoryBudgetConfig(): SubcategoryBudgetConfig {
  return createEmptyCategoryBudgetConfig();
}

export function createEmptyBudgetSettings(): BudgetSettings {
  return { version: 2, categories: {}, subcategories: {} };
}
