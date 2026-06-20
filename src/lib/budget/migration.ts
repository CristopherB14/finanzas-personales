import type { Category } from "@/types/database";
import { getSubcategories, isSubcategory } from "@/lib/categories/helpers";
import {
  type BudgetSettings,
  createEmptyCategoryBudgetConfig,
  createEmptySubcategoryBudgetConfig,
} from "@/types/budget";

/** Valores usados solo una vez al migrar usuarios sin configuración previa. */
const LEGACY_FIXED_LIMITS_BY_NAME: Record<string, number> = {
  Alimentación: 15000000,
  Transporte: 8000000,
  Entretenimiento: 5000000,
  Vivienda: 25000000,
};

const LEGACY_DEFAULT_FIXED_CENTS = 10000000;

function topLevelCategories(categories: Category[]): Category[] {
  return categories.filter((c) => !isSubcategory(c));
}

export function createLegacyBudgetSettings(
  categories: Category[]
): BudgetSettings {
  const categoriesConfig: BudgetSettings["categories"] = {};

  for (const category of topLevelCategories(categories)) {
    const fixedCents =
      LEGACY_FIXED_LIMITS_BY_NAME[category.name] ?? LEGACY_DEFAULT_FIXED_CENTS;
    categoriesConfig[category.id] = {
      mode: "fixed",
      fixedCents,
      percentage: 0,
    };
  }

  return { version: 2, categories: categoriesConfig, subcategories: {} };
}

export function budgetSettingsFromFixedLimits(
  limitsByCategoryId: Record<string, number>,
  categories: Category[]
): BudgetSettings {
  const categoriesConfig: BudgetSettings["categories"] = {};

  for (const category of topLevelCategories(categories)) {
    categoriesConfig[category.id] = {
      mode: "fixed",
      fixedCents: limitsByCategoryId[category.id] ?? 0,
      percentage: 0,
    };
  }

  return { version: 2, categories: categoriesConfig, subcategories: {} };
}

export function fillMissingBudgetCategories(
  settings: BudgetSettings,
  categories: Category[]
): BudgetSettings {
  const categoriesConfig = { ...settings.categories };
  const subcategoriesConfig = { ...settings.subcategories };

  for (const category of topLevelCategories(categories)) {
    if (!categoriesConfig[category.id]) {
      categoriesConfig[category.id] = createEmptyCategoryBudgetConfig();
    }
  }

  for (const category of categories) {
    if (!isSubcategory(category)) continue;
    if (!subcategoriesConfig[category.id]) {
      subcategoriesConfig[category.id] = createEmptySubcategoryBudgetConfig();
    }
  }

  return {
    version: 2,
    categories: categoriesConfig,
    subcategories: subcategoriesConfig,
  };
}

export function sumSubcategoryPercentages(
  settings: BudgetSettings,
  categories: Category[],
  parentCategoryId: string
): number {
  const subcategories = getSubcategories(categories, parentCategoryId);
  let total = 0;

  for (const sub of subcategories) {
    const config = settings.subcategories[sub.id];
    if (config?.mode === "percentage" && config.percentage > 0) {
      total += config.percentage;
    }
  }

  return total;
}
