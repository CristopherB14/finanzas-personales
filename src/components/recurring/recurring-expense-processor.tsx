"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useRecurringExpenses } from "@/hooks/use-recurring-expenses";
import { notifySyncComplete } from "@/lib/sync/sync-engine";

/** Processes auto-create recurring expenses on app load and after sync. */
export function RecurringExpenseProcessor() {
  const { user } = useUser();
  const { transactions, addTransaction } = useTransactions(user?.id);
  const { expenses, processDue, loading } = useRecurringExpenses(user?.id);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!user?.id || loading || expenses.length === 0) return;
    if (processingRef.current) return;

    const hasAutoCreate = expenses.some((e) => e.is_active && e.auto_create);
    if (!hasAutoCreate) return;

    processingRef.current = true;
    const clientIds = new Set(transactions.map((t) => t.client_id));

    void processDue(addTransaction, clientIds).then((processed) => {
      if (processed > 0) {
        notifySyncComplete();
      }
    }).finally(() => {
      processingRef.current = false;
    });
  }, [user?.id, loading, expenses, transactions, addTransaction, processDue]);

  return null;
}
