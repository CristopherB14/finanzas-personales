"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ensureBudgetSettings,
  updateCategoryBudgetConfig,
} from "@/lib/data/budgets";
import { fetchCategories } from "@/lib/data/categories";
import {
  computeBudgetLimits,
  filterByMonth,
  summarizeMonth,
} from "@/lib/finance/calculations";
import type { Category, Transaction } from "@/types/database";
import type { BudgetSettings, CategoryBudgetConfig } from "@/types/budget";

export function useBudget(
  userId: string | undefined,
  transactions: Transaction[]
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

    const cats = await fetchCategories(userId, "expense");
    setCategories(cats);

    const budgetSettings = await ensureBudgetSettings(userId, cats, year, month);
    setSettings(budgetSettings);
    setDataLoading(false);
  }, [userId, year, month]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    void (async () => {
      const cats = await fetchCategories(userId, "expense");
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
  }, [userId, year, month]);

  const monthTransactions = useMemo(
    () => filterByMonth(transactions, year, month),
    [transactions, year, month]
  );

  const monthlyIncomeCents = useMemo(
    () => summarizeMonth(monthTransactions).incomeCents,
    [monthTransactions]
  );

  const limits = useMemo(() => {
    if (!settings) return {};
    return computeBudgetLimits(settings.categories, monthlyIncomeCents);
  }, [settings, monthlyIncomeCents]);

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const transaction of monthTransactions) {
      if (transaction.type !== "expense" || !transaction.category_id) continue;
      map[transaction.category_id] =
        (map[transaction.category_id] ?? 0) + transaction.amount_cents;
    }
    return map;
  }, [monthTransactions]);

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
              version: 1,
              categories: { ...prev.categories, [categoryId]: config },
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

  return {
    categories: userId ? categories : [],
    settings: userId ? settings : null,
    limits,
    spentByCategory,
    monthlyIncomeCents,
    hasPercentageCategories,
    loading,
    refresh,
    updateCategoryBudget,
  };
}
