"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import {
  getLocalTransactions,
  saveLocalTransaction,
} from "@/lib/db/local-db";
import { startAutoSync } from "@/lib/sync/sync-engine";
import type { LocalTransaction, TransactionType } from "@/types/database";

export function useTransactions(userId: string | undefined) {
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const local = await getLocalTransactions(userId);

    if (navigator.onLine) {
      const supabase = createClient();
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false })
        .limit(500);

      if (data?.length) {
        const merged = new Map<string, LocalTransaction>();
        for (const t of data) merged.set(t.client_id, { ...t, _syncStatus: "synced" });
        for (const t of local) {
          const existing = merged.get(t.client_id);
          if (
            !existing ||
            new Date(t.updated_at) > new Date(existing.updated_at)
          ) {
            merged.set(t.client_id, t);
          }
        }
        setTransactions(
          Array.from(merged.values()).sort((a, b) =>
            b.transaction_date.localeCompare(a.transaction_date)
          )
        );
        setLoading(false);
        return;
      }
    }

    setTransactions(local);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    return startAutoSync(userId);
  }, [userId]);

  const addTransaction = async (input: {
    account_id: string;
    category_id: string | null;
    type: TransactionType;
    amount_cents: number;
    currency_code: string;
    transaction_date: string;
    description?: string;
  }) => {
    if (!userId) throw new Error("No autenticado");

    const client_id = uuidv4();
    const tx: LocalTransaction = {
      id: `local-${client_id}`,
      user_id: userId,
      client_id,
      account_id: input.account_id,
      category_id: input.category_id,
      type: input.type,
      amount_cents: input.amount_cents,
      currency_code: input.currency_code,
      transaction_date: input.transaction_date,
      description: input.description ?? null,
      tags: [],
      updated_at: new Date().toISOString(),
      _syncStatus: "pending",
      _localOnly: true,
    };

    await saveLocalTransaction(tx);
    setTransactions((prev) => [tx, ...prev]);

    if (navigator.onLine) {
      const supabase = createClient();
      await supabase.from("transactions").upsert({
        user_id: userId,
        account_id: tx.account_id,
        category_id: tx.category_id,
        type: tx.type,
        amount_cents: tx.amount_cents,
        currency_code: tx.currency_code,
        transaction_date: tx.transaction_date,
        description: tx.description,
        tags: tx.tags,
        client_id: tx.client_id,
      });
    }

    return tx;
  };

  return { transactions, loading, refresh, addTransaction };
}
