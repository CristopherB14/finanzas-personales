"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ensureBudgetSettings,
  removeSubcategoryBudgetConfig,
  updateCategoryBudgetConfig,
  updateSubcategoryBudgetConfig,
} from "@/lib/data/budgets";
import { fetchCategories } from "@/lib/data/categories";
import { sumSubcategoryPercentages } from "@/lib/budget/migration";
import { getSubcategories } from "@/lib/categories/helpers";
import {
  computeBudgetLimits,
  computeCategorySpentCents,
  computeSpentByCategoryId,
  computeSubcategoryBudgetLimits,
  filterByMonth,
  summarizeMonth,
} from "@/lib/finance/calculations";
import type { Category, Transaction } from "@/types/database";
import type {
  BudgetSettings,
  CategoryBudgetConfig,
  SubcategoryBudgetConfig,
} from "@/types/budget";

export type BudgetCategoryKind = "expense" | "investment";

export function useBudget(
  userId: string | undefined,
  transactions: Transaction[],
  categoryKind: BudgetCategoryKind = "expense"
) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = Boolean(userId) && dataLoading;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const refresh = useCallback(async () => {
    if (!userId) return;
    setDataLoading(true);

    const cats = await fetchCategories(userId, categoryKind);
    setCategories(cats);

    const budgetSettings = await ensureBudgetSettings(userId, cats, year, month);
    setSettings(budgetSettings);
    setDataLoading(false);
  }, [userId, year, month, categoryKind]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    void (async () => {
      const cats = await fetchCategories(userId, categoryKind);
      const budgetSettings = await ensureBudgetSettings(
        userId,
        cats,
        year,
        month
      );
      if (!cancelled) {
        setCategories(cats);
        setSettings(budgetSettings);
        setDataLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, year, month, categoryKind]);

  const monthTransactions = useMemo(
    () => filterByMonth(transactions, year, month),
    [transactions, year, month]
  );

  const monthlyIncomeCents = useMemo(
    () => summarizeMonth(monthTransactions).incomeCents,
    [monthTransactions]
  );

  const topLevelCategories = useMemo(
    () => categories.filter((c) => c.parent_id === null),
    [categories]
  );

  const limits = useMemo(() => {
    if (!settings) return {};
    return computeBudgetLimits(settings.categories, monthlyIncomeCents);
  }, [settings, monthlyIncomeCents]);

  const subcategoryLimitsByCategory = useMemo(() => {
    if (!settings) return {};

    const map: Record<string, Record<string, number>> = {};
    for (const category of topLevelCategories) {
      const categoryLimit = limits[category.id] ?? 0;
      const subcategories = getSubcategories(categories, category.id);
      const configs: Record<string, SubcategoryBudgetConfig> = {};

      for (const sub of subcategories) {
        const config = settings.subcategories[sub.id];
        if (config) configs[sub.id] = config;
      }

      map[category.id] = computeSubcategoryBudgetLimits(
        configs,
        categoryLimit
      );
    }

    return map;
  }, [settings, limits, topLevelCategories, categories]);

  const spentByCategoryId = useMemo(
    () => computeSpentByCategoryId(monthTransactions, categoryKind),
    [monthTransactions, categoryKind]
  );

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const category of topLevelCategories) {
      map[category.id] = computeCategorySpentCents(
        category.id,
        categories,
        spentByCategoryId
      );
    }
    return map;
  }, [topLevelCategories, categories, spentByCategoryId]);

  const hasPercentageCategories = useMemo(() => {
    if (!settings) return false;
    return Object.values(settings.categories).some(
      (config) => config.mode === "percentage" && config.percentage > 0
    );
  }, [settings]);

  const updateCategoryBudget = useCallback(
    async (categoryId: string, config: CategoryBudgetConfig) => {
      if (!userId || !settings) return;

      setSettings((prev) =>
        prev
          ? {
              version: 2,
              categories: { ...prev.categories, [categoryId]: config },
              subcategories: prev.subcategories,
            }
          : prev
      );

      const next = await updateCategoryBudgetConfig(
        userId,
        settings,
        categoryId,
        config
      );
      setSettings(next);
    },
    [settings, userId]
  );

  const updateSubcategoryBudget = useCallback(
    async (subcategoryId: string, config: SubcategoryBudgetConfig) => {
      if (!userId || !settings) return;

      const subcategory = categories.find((c) => c.id === subcategoryId);
      if (!subcategory?.parent_id) return;

      const nextSettings: BudgetSettings = {
        version: 2,
        categories: settings.categories,
        subcategories: {
          ...settings.subcategories,
          [subcategoryId]: config,
        },
      };

      const total = sumSubcategoryPercentages(
        nextSettings,
        categories,
        subcategory.parent_id
      );
      if (total > 100) return;

      setSettings(nextSettings);

      const next = await updateSubcategoryBudgetConfig(
        userId,
        settings,
        subcategoryId,
        config
      );
      setSettings(next);
    },
    [settings, userId, categories]
  );

  const removeSubcategoryBudget = useCallback(
    async (subcategoryId: string) => {
      if (!userId || !settings) return;

      setSettings((prev) => {
        if (!prev) return prev;
        const subcategories = { ...prev.subcategories };
        delete subcategories[subcategoryId];
        return { version: 2, categories: prev.categories, subcategories };
      });

      const next = await removeSubcategoryBudgetConfig(
        userId,
        settings,
        subcategoryId
      );
      setSettings(next);
    },
    [settings, userId]
  );

  return {
    categories: userId ? topLevelCategories : [],
    allCategories: userId ? categories : [],
    settings: userId ? settings : null,
    limits,
    subcategoryLimitsByCategory,
    spentByCategory,
    spentByCategoryId,
    monthlyIncomeCents,
    hasPercentageCategories,
    loading,
    refresh,
    updateCategoryBudget,
    updateSubcategoryBudget,
    removeSubcategoryBudget,
    categoryKind,
  };
}
