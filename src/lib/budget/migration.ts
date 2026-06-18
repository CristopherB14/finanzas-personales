import type { Category } from "@/types/database";
import {
  type BudgetSettings,
  createEmptyCategoryBudgetConfig,
} from "@/types/budget";

/** Valores usados solo una vez al migrar usuarios sin configuración previa. */
const LEGACY_FIXED_LIMITS_BY_NAME: Record<string, number> = {
  Alimentación: 15000000,
  Transporte: 8000000,
  Entretenimiento: 5000000,
  Vivienda: 25000000,
};

const LEGACY_DEFAULT_FIXED_CENTS = 10000000;

export function createLegacyBudgetSettings(
  categories: Category[]
): BudgetSettings {
  const categoriesConfig: BudgetSettings["categories"] = {};

  for (const category of categories) {
    const fixedCents =
      LEGACY_FIXED_LIMITS_BY_NAME[category.name] ?? LEGACY_DEFAULT_FIXED_CENTS;
    categoriesConfig[category.id] = {
      mode: "fixed",
      fixedCents,
      percentage: 0,
    };
  }

  return { version: 1, categories: categoriesConfig };
}

export function budgetSettingsFromFixedLimits(
  limitsByCategoryId: Record<string, number>,
  categories: Category[]
): BudgetSettings {
  const categoriesConfig: BudgetSettings["categories"] = {};

  for (const category of categories) {
    categoriesConfig[category.id] = {
      mode: "fixed",
      fixedCents: limitsByCategoryId[category.id] ?? 0,
      percentage: 0,
    };
  }

  return { version: 1, categories: categoriesConfig };
}

export function fillMissingBudgetCategories(
  settings: BudgetSettings,
  categories: Category[]
): BudgetSettings {
  const categoriesConfig = { ...settings.categories };

  for (const category of categories) {
    if (!categoriesConfig[category.id]) {
      categoriesConfig[category.id] = createEmptyCategoryBudgetConfig();
    }
  }

  return { version: 1, categories: categoriesConfig };
}
