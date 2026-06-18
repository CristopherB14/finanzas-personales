import { createClient } from "@/lib/supabase/client";
import {
  budgetSettingsFromFixedLimits,
  createLegacyBudgetSettings,
  fillMissingBudgetCategories,
} from "@/lib/budget/migration";
import type { Category } from "@/types/database";
import {
  BUDGET_PREFERENCES_KEY,
  type BudgetSettings,
  type CategoryBudgetConfig,
} from "@/types/budget";

function parseBudgetSettings(value: unknown): BudgetSettings | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (record.version !== 1 || typeof record.categories !== "object") return null;

  const rawCategories = record.categories;
  if (!rawCategories || typeof rawCategories !== "object") return null;

  const categories: BudgetSettings["categories"] = {};
  for (const [categoryId, rawConfig] of Object.entries(
    rawCategories as Record<string, unknown>
  )) {
    if (!rawConfig || typeof rawConfig !== "object") continue;
    const config = rawConfig as Record<string, unknown>;
    const mode = config.mode === "percentage" ? "percentage" : "fixed";
    categories[categoryId] = {
      mode,
      fixedCents:
        typeof config.fixedCents === "number" && config.fixedCents >= 0
          ? config.fixedCents
          : 0,
      percentage:
        typeof config.percentage === "number" &&
        config.percentage >= 0 &&
        config.percentage <= 100
          ? config.percentage
          : 0,
    };
  }

  return { version: 1, categories };
}

async function fetchProfilePreferences(
  userId: string
): Promise<Record<string, unknown>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .maybeSingle();

  if (!data?.preferences || typeof data.preferences !== "object") {
    return {};
  }

  return data.preferences as Record<string, unknown>;
}

export async function fetchBudgetSettings(
  userId: string
): Promise<BudgetSettings | null> {
  const preferences = await fetchProfilePreferences(userId);
  return parseBudgetSettings(preferences[BUDGET_PREFERENCES_KEY]);
}

export async function saveBudgetSettings(
  userId: string,
  settings: BudgetSettings
): Promise<void> {
  const supabase = createClient();
  const preferences = await fetchProfilePreferences(userId);

  const { error } = await supabase
    .from("profiles")
    .update({
      preferences: {
        ...preferences,
        [BUDGET_PREFERENCES_KEY]: settings,
      },
    })
    .eq("id", userId);

  if (error) throw error;
}

async function fetchLegacyBudgetLines(
  userId: string,
  year: number,
  month: number
): Promise<Record<string, number> | null> {
  const supabase = createClient();
  const { data: budget } = await supabase
    .from("budgets")
    .select("id")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (!budget) return null;

  const { data: lines } = await supabase
    .from("budget_lines")
    .select("category_id, limit_cents")
    .eq("budget_id", budget.id);

  if (!lines?.length) return null;

  const limits: Record<string, number> = {};
  for (const line of lines) {
    limits[line.category_id] = line.limit_cents;
  }

  return limits;
}

export async function ensureBudgetSettings(
  userId: string,
  categories: Category[],
  year: number,
  month: number
): Promise<BudgetSettings> {
  const existing = await fetchBudgetSettings(userId);
  if (existing && Object.keys(existing.categories).length > 0) {
    const filled = fillMissingBudgetCategories(existing, categories);
    if (filled.categories !== existing.categories) {
      await saveBudgetSettings(userId, filled);
    }
    return filled;
  }

  const legacyLines = await fetchLegacyBudgetLines(userId, year, month);
  if (legacyLines) {
    const migrated = budgetSettingsFromFixedLimits(legacyLines, categories);
    await saveBudgetSettings(userId, migrated);
    return migrated;
  }

  const legacyDefaults = createLegacyBudgetSettings(categories);
  await saveBudgetSettings(userId, legacyDefaults);
  return legacyDefaults;
}

export async function updateCategoryBudgetConfig(
  userId: string,
  settings: BudgetSettings,
  categoryId: string,
  config: CategoryBudgetConfig
): Promise<BudgetSettings> {
  const next: BudgetSettings = {
    version: 1,
    categories: {
      ...settings.categories,
      [categoryId]: config,
    },
  };

  await saveBudgetSettings(userId, next);
  return next;
}
