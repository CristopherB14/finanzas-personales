"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "@/lib/data/categories";
import type { Category, CategoryType, Transaction } from "@/types/database";

export function useCategories(
  userId: string | undefined,
  transactions: Transaction[] = []
) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = Boolean(userId) && dataLoading;

  const refresh = useCallback(async () => {
    if (!userId) return;
    const data = await fetchCategories(userId);
    setCategories(data);
    setDataLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void fetchCategories(userId).then((data) => {
      if (!cancelled) {
        setCategories(data);
        setDataLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addCategory = async (input: {
    name: string;
    type: CategoryType;
    icon?: string;
    color?: string;
  }) => {
    if (!userId) throw new Error("No autenticado");
    const category = await createCategory(userId, input);
    setCategories((prev) =>
      [...prev, category].sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.sort_order - b.sort_order;
      })
    );
    return category;
  };

  const editCategory = async (
    categoryId: string,
    input: { name: string; icon?: string; color?: string }
  ) => {
    if (!userId) throw new Error("No autenticado");
    const category = await updateCategory(userId, categoryId, input);
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? category : c))
    );
    return category;
  };

  const removeCategory = async (categoryId: string) => {
    if (!userId) throw new Error("No autenticado");
    const result = await deleteCategory(userId, categoryId, transactions);
    if (result.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    }
    return result;
  };

  const expenseCategories = useMemo(
    () => (userId ? categories.filter((c) => c.type === "expense") : []),
    [categories, userId]
  );
  const incomeCategories = useMemo(
    () => (userId ? categories.filter((c) => c.type === "income") : []),
    [categories, userId]
  );

  return {
    categories: userId ? categories : [],
    expenseCategories,
    incomeCategories,
    loading,
    refresh,
    addCategory,
    editCategory,
    removeCategory,
  };
}
