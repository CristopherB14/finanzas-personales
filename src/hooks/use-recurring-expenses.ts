"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  confirmRecurringOccurrence,
  getRecurringExpenseStatus,
  processAutoCreateRecurringExpenses,
} from "@/lib/recurrence/generator";
import {
  createRecurringExpense,
  deleteRecurringExpense,
  fetchRecurringExpenses,
  updateRecurringExpense,
} from "@/lib/data/recurring-expenses";
import type { RecurringExpense } from "@/types/database";
import type { RecurringExpenseInput } from "@/lib/data/recurring-expenses";
import type { AddTransactionFn } from "@/lib/recurrence/generator";

export function useRecurringExpenses(userId: string | undefined) {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = Boolean(userId) && dataLoading;

  const refresh = useCallback(async () => {
    if (!userId) return;
    const data = await fetchRecurringExpenses(userId);
    setExpenses(data);
    setDataLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void fetchRecurringExpenses(userId).then((data) => {
      if (!cancelled) {
        setExpenses(data);
        setDataLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addRecurringExpense = async (input: RecurringExpenseInput) => {
    if (!userId) throw new Error("No autenticado");
    const created = await createRecurringExpense(userId, input);
    setExpenses((prev) =>
      [...prev, created].sort((a, b) =>
        a.next_due_date.localeCompare(b.next_due_date)
      )
    );
    return created;
  };

  const editRecurringExpense = async (
    id: string,
    input: Partial<RecurringExpenseInput>
  ) => {
    if (!userId) throw new Error("No autenticado");
    const updated = await updateRecurringExpense(userId, id, input);
    setExpenses((prev) =>
      prev
        .map((e) => (e.id === id ? updated : e))
        .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
    );
    return updated;
  };

  const removeRecurringExpense = async (id: string) => {
    if (!userId) throw new Error("No autenticado");
    await deleteRecurringExpense(userId, id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const getRecurringById = useCallback(
    (id: string) => expenses.find((e) => e.id === id) ?? null,
    [expenses]
  );

  const overdue = useMemo(
    () =>
      expenses.filter((e) => getRecurringExpenseStatus(e) === "overdue"),
    [expenses]
  );

  const upcoming = useMemo(
    () =>
      expenses.filter((e) => getRecurringExpenseStatus(e) === "upcoming"),
    [expenses]
  );

  const inactive = useMemo(
    () =>
      expenses.filter((e) => getRecurringExpenseStatus(e) === "inactive"),
    [expenses]
  );

  const processDue = useCallback(
    async (
      addTransaction: AddTransactionFn,
      existingClientIds: Set<string>
    ) => {
      if (!userId || expenses.length === 0) return 0;
      const processed = await processAutoCreateRecurringExpenses({
        expenses,
        existingClientIds,
        addTransaction,
      });
      if (processed > 0) {
        await refresh();
      }
      return processed;
    },
    [userId, expenses, refresh]
  );

  const confirmOccurrence = useCallback(
    async (
      id: string,
      addTransaction: AddTransactionFn,
      existingClientIds: Set<string>
    ) => {
      if (!userId) throw new Error("No autenticado");
      const expense = expenses.find((e) => e.id === id);
      if (!expense) throw new Error("Gasto recurrente no encontrado");

      const tx = await confirmRecurringOccurrence({
        expense,
        existingClientIds,
        addTransaction,
      });
      await refresh();
      return tx;
    },
    [userId, expenses, refresh]
  );

  return {
    expenses: userId ? expenses : [],
    overdue,
    upcoming,
    inactive,
    loading,
    refresh,
    addRecurringExpense,
    editRecurringExpense,
    removeRecurringExpense,
    getRecurringById,
    processDue,
    confirmOccurrence,
  };
}
