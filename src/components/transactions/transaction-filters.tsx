"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { getTopLevelCategories } from "@/lib/categories/helpers";
import { choicePill, selectField } from "@/lib/a11y";
import type { Account, Category } from "@/types/database";

export type TransactionListTypeFilter =
  | "all"
  | "income"
  | "expense"
  | "recurring";

export interface TransactionFilters {
  type: TransactionListTypeFilter;
  categoryId: string;
  subcategoryId: string;
  accountId: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  type: "all",
  categoryId: "",
  subcategoryId: "",
  accountId: "",
  dateFrom: "",
  dateTo: "",
};

export function parseTransactionFilters(
  params: URLSearchParams
): TransactionFilters {
  const type = params.get("tipo");
  return {
    type:
      type === "income" ||
      type === "expense" ||
      type === "recurring" ||
      type === "all"
        ? type
        : "all",
    categoryId: params.get("categoria") ?? "",
    subcategoryId: params.get("subcategoria") ?? "",
    accountId: params.get("cuenta") ?? "",
    dateFrom: params.get("desde") ?? "",
    dateTo: params.get("hasta") ?? "",
  };
}

export function buildTransactionFilterSearchParams(
  filters: TransactionFilters
): string {
  const params = new URLSearchParams();
  if (filters.type !== "all") params.set("tipo", filters.type);
  if (filters.categoryId) params.set("categoria", filters.categoryId);
  if (filters.subcategoryId) params.set("subcategoria", filters.subcategoryId);
  if (filters.accountId) params.set("cuenta", filters.accountId);
  if (filters.dateFrom) params.set("desde", filters.dateFrom);
  if (filters.dateTo) params.set("hasta", filters.dateTo);
  const query = params.toString();
  return query ? `?${query}` : "";
}

interface TransactionFiltersPanelProps {
  filters: TransactionFilters;
  categories: Category[];
  accounts: Account[];
}

export function TransactionFiltersPanel({
  filters,
  categories,
  accounts,
}: TransactionFiltersPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const expenseCategories = useMemo(
    () => getTopLevelCategories(categories, "expense"),
    [categories]
  );
  const incomeCategories = useMemo(
    () => getTopLevelCategories(categories, "income"),
    [categories]
  );

  const parentCategories = useMemo(() => {
    if (filters.type === "income") return incomeCategories;
    if (filters.type === "expense" || filters.type === "recurring") {
      return expenseCategories;
    }
    return [...expenseCategories, ...incomeCategories];
  }, [filters.type, expenseCategories, incomeCategories]);

  const subcategories = useMemo(() => {
    if (!filters.categoryId) return [];
    return categories.filter((c) => c.parent_id === filters.categoryId);
  }, [categories, filters.categoryId]);

  const updateFilters = (patch: Partial<TransactionFilters>) => {
    const next = { ...filters, ...patch };
    if (patch.categoryId !== undefined && patch.categoryId !== filters.categoryId) {
      next.subcategoryId = "";
    }
    const base = searchParams.toString();
    const current = parseTransactionFilters(new URLSearchParams(base));
    const merged = { ...current, ...next };
    router.replace(
      `/transacciones${buildTransactionFilterSearchParams(merged)}`,
      { scroll: false }
    );
  };

  const typeOptions: { value: TransactionListTypeFilter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "income", label: "Ingresos" },
    { value: "expense", label: "Gastos" },
    { value: "recurring", label: "Recurrentes" },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="space-y-2">
        <Label>Tipo</Label>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={choicePill(filters.type === opt.value, true)}
              onClick={() => updateFilters({ type: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="filter-category">Categoría</Label>
          <select
            id="filter-category"
            value={filters.categoryId}
            onChange={(e) => updateFilters({ categoryId: e.target.value })}
            className={selectField}
          >
            <option value="">Todas</option>
            {parentCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-subcategory">Subcategoría</Label>
          <select
            id="filter-subcategory"
            value={filters.subcategoryId}
            onChange={(e) => updateFilters({ subcategoryId: e.target.value })}
            className={selectField}
            disabled={!filters.categoryId}
          >
            <option value="">Todas</option>
            {subcategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-account">Cuenta</Label>
          <select
            id="filter-account"
            value={filters.accountId}
            onChange={(e) => updateFilters({ accountId: e.target.value })}
            className={selectField}
          >
            <option value="">Todas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-from">Desde</Label>
          <input
            id="filter-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            className={selectField}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="filter-to">Hasta</Label>
          <input
            id="filter-to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            className={selectField}
          />
        </div>
      </div>
    </div>
  );
}
