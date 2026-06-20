"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  fetchCategories,
  updateCategory,
  updateSubcategory,
} from "@/lib/data/categories";
import {
  getSubcategories,
  getTopLevelCategories,
} from "@/lib/categories/helpers";
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

  const sortCategories = (items: Category[]) =>
    [...items].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.sort_order - b.sort_order;
    });

  const addCategory = async (input: {
    name: string;
    type: CategoryType;
    icon?: string;
    color?: string;
  }) => {
    if (!userId) throw new Error("No autenticado");
    const category = await createCategory(userId, input);
    setCategories((prev) => sortCategories([...prev, category]));
    return category;
  };

  const addSubcategory = async (
    parentId: string,
    input: { name: string; icon?: string; color?: string }
  ) => {
    if (!userId) throw new Error("No autenticado");
    const subcategory = await createSubcategory(userId, parentId, input);
    setCategories((prev) => sortCategories([...prev, subcategory]));
    return subcategory;
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

  const editSubcategory = async (
    subcategoryId: string,
    input: { name: string; icon?: string; color?: string }
  ) => {
    if (!userId) throw new Error("No autenticado");
    const subcategory = await updateSubcategory(userId, subcategoryId, input);
    setCategories((prev) =>
      prev.map((c) => (c.id === subcategoryId ? subcategory : c))
    );
    return subcategory;
  };

  const removeCategory = async (categoryId: string) => {
    if (!userId) throw new Error("No autenticado");
    const result = await deleteCategory(
      userId,
      categoryId,
      transactions,
      categories
    );
    if (result.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    }
    return result;
  };

  const removeSubcategory = async (subcategoryId: string) => {
    if (!userId) throw new Error("No autenticado");
    const result = await deleteSubcategory(userId, subcategoryId, transactions);
    if (result.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== subcategoryId));
    }
    return result;
  };

  const getSubcategoriesFor = useCallback(
    (parentId: string) => getSubcategories(categories, parentId),
    [categories]
  );

  const expenseCategories = useMemo(
    () =>
      userId ? getTopLevelCategories(categories, "expense") : [],
    [categories, userId]
  );

  const incomeCategories = useMemo(
    () =>
      userId ? getTopLevelCategories(categories, "income") : [],
    [categories, userId]
  );

  return {
    categories: userId ? categories : [],
    expenseCategories,
    incomeCategories,
    getSubcategoriesFor,
    loading,
    refresh,
    addCategory,
    addSubcategory,
    editCategory,
    editSubcategory,
    removeCategory,
    removeSubcategory,
  };
}
