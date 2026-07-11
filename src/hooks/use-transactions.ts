"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import { fetchCategories } from "@/lib/data/categories";
import {
  ensureInvestmentAsset,
  recalculateAllInvestmentAssets,
} from "@/lib/data/investment-assets";
import {
  dedupeLocalTransactionsByClientId,
  deleteLocalTransaction,
  getLocalTransactionByClientId,
  getLocalTransactions,
  mergeRemoteTransactions,
  reconcileLocalTransactionId,
  saveLocalTransaction,
  updateLocalTransaction,
} from "@/lib/db/local-db";
import { onSyncComplete, notifySyncComplete } from "@/lib/sync/sync-engine";
import type { LocalTransaction, TransactionType } from "@/types/database";

/** In-flight creates keyed by client_id — ignores concurrent duplicate submits. */
const inflightCreates = new Map<string, Promise<LocalTransaction>>();

export type TransactionInput = {
  account_id: string;
  to_account_id?: string;
  category_id: string | null;
  type: TransactionType;
  amount_cents: number;
  currency_code: string;
  original_amount_cents?: number;
  exchange_rate?: number | null;
  converted_amount_cents?: number | null;
  exchange_rate_source?: "bna" | "manual" | null;
  transaction_date: string;
  description?: string;
  client_id?: string;
  recurring_expense_id?: string;
  tags?: string[];
};

function sortTransactions(transactions: LocalTransaction[]) {
  return [...transactions].sort((a, b) => {
    const dateCmp = b.transaction_date.localeCompare(a.transaction_date);
    if (dateCmp !== 0) return dateCmp;
    return b.updated_at.localeCompare(a.updated_at);
  });
}

async function resolveInvestmentAssetId(
  userId: string,
  categoryId: string | null,
  currencyCode: string
): Promise<string | null> {
  if (!categoryId) return null;

  const categories = await fetchCategories(userId);
  const subcategory = categories.find((c) => c.id === categoryId);
  if (!subcategory?.parent_id) return null;

  const asset = await ensureInvestmentAsset(
    userId,
    subcategory.parent_id,
    categoryId,
    currencyCode
  );
  return asset.id;
}

function remoteTransactionId(tx: LocalTransaction): string {
  // Prefer a stable UUID so local and remote share the same primary key.
  // Legacy rows used `local-{client_id}`; map those to client_id on upsert.
  return tx.id.startsWith("local-") ? tx.client_id : tx.id;
}

async function upsertRemoteTransaction(
  userId: string,
  tx: LocalTransaction
): Promise<string> {
  const supabase = createClient();
  const remoteId = remoteTransactionId(tx);
  const { data, error } = await supabase
    .from("transactions")
    .upsert(
      {
        id: remoteId,
        user_id: userId,
        account_id: tx.account_id,
        to_account_id: tx.to_account_id ?? null,
        category_id: tx.category_id,
        investment_asset_id: tx.investment_asset_id ?? null,
        type: tx.type,
        amount_cents: tx.amount_cents,
        currency_code: tx.currency_code,
        original_amount_cents: tx.original_amount_cents ?? tx.amount_cents,
        exchange_rate: tx.exchange_rate ?? null,
        converted_amount_cents: tx.converted_amount_cents ?? null,
        exchange_rate_source: tx.exchange_rate_source ?? null,
        transaction_date: tx.transaction_date,
        description: tx.description,
        tags: tx.tags,
        client_id: tx.client_id,
        recurring_expense_id: tx.recurring_expense_id ?? null,
      },
      { onConflict: "user_id,client_id" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return data?.id ?? remoteId;
}

async function deleteRemoteTransaction(
  userId: string,
  clientId: string
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId)
    .eq("client_id", clientId);
}

async function syncInvestmentAssetsIfNeeded(
  userId: string,
  transactions: LocalTransaction[]
): Promise<void> {
  if (!navigator.onLine) return;
  const categories = await fetchCategories(userId);
  await recalculateAllInvestmentAssets(userId, transactions, categories);
}

async function loadLocalTransactions(
  userId: string
): Promise<LocalTransaction[]> {
  return sortTransactions(await getLocalTransactions(userId));
}

async function bootstrapTransactions(
  userId: string
): Promise<LocalTransaction[]> {
  await dedupeLocalTransactionsByClientId(userId);
  const local = await loadLocalTransactions(userId);
  if (local.length > 0 || !navigator.onLine) {
    return local;
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("transaction_date", { ascending: false })
    .limit(500);

  if (data?.length) {
    await mergeRemoteTransactions(data);
    await dedupeLocalTransactionsByClientId(userId);
    return loadLocalTransactions(userId);
  }

  return local;
}

export function useTransactions(userId: string | undefined) {
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = Boolean(userId) && dataLoading;

  const refresh = useCallback(async () => {
    if (!userId) return;
    setDataLoading(true);
    const data = await loadLocalTransactions(userId);
    setTransactions(data);
    setDataLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void bootstrapTransactions(userId).then((data) => {
      if (!cancelled) {
        setTransactions(data);
        setDataLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    return onSyncComplete(() => {
      void loadLocalTransactions(userId).then(setTransactions);
    });
  }, [userId]);

  const addTransaction = async (input: TransactionInput) => {
    if (!userId) throw new Error("No autenticado");

    const client_id = input.client_id ?? uuidv4();

    // Idempotency: return existing row / in-flight create for the same client_id.
    const existingLocal =
      transactions.find((t) => t.client_id === client_id) ??
      (await getLocalTransactionByClientId(client_id));
    if (existingLocal) {
      return existingLocal;
    }

    const inflight = inflightCreates.get(client_id);
    if (inflight) {
      return inflight;
    }

    const createPromise = (async () => {
      let investment_asset_id: string | null = null;

      if (input.type === "investment") {
        investment_asset_id = await resolveInvestmentAssetId(
          userId,
          input.category_id,
          input.currency_code
        );
      }

      // Use client_id as the primary key so local and remote share one id.
      let tx: LocalTransaction = {
        id: client_id,
        user_id: userId,
        client_id,
        account_id: input.account_id,
        to_account_id:
          input.type === "transfer" ? (input.to_account_id ?? null) : null,
        category_id: input.type === "transfer" ? null : input.category_id,
        investment_asset_id,
        type: input.type,
        amount_cents: input.amount_cents,
        currency_code: input.currency_code,
        original_amount_cents: input.original_amount_cents ?? input.amount_cents,
        exchange_rate: input.exchange_rate ?? null,
        converted_amount_cents: input.converted_amount_cents ?? null,
        exchange_rate_source: input.exchange_rate_source ?? null,
        transaction_date: input.transaction_date,
        description: input.description ?? null,
        tags: input.tags ?? [],
        recurring_expense_id: input.recurring_expense_id ?? null,
        updated_at: new Date().toISOString(),
        _syncStatus: "pending",
        _localOnly: true,
      };

      await saveLocalTransaction(tx);
      setTransactions((prev) => {
        if (prev.some((t) => t.client_id === client_id)) {
          return prev;
        }
        return sortTransactions([tx, ...prev]);
      });

      if (navigator.onLine) {
        const remoteId = await upsertRemoteTransaction(userId, tx);
        tx = await reconcileLocalTransactionId(tx, remoteId);
        setTransactions((prev) =>
          sortTransactions(
            prev.map((t) => (t.client_id === client_id ? tx : t))
          )
        );
        if (input.type === "investment") {
          const next = await loadLocalTransactions(userId);
          await syncInvestmentAssetsIfNeeded(userId, next);
        }
      }

      notifySyncComplete();
      return tx;
    })();

    inflightCreates.set(client_id, createPromise);
    try {
      return await createPromise;
    } finally {
      inflightCreates.delete(client_id);
    }
  };

  const editTransaction = async (
    clientId: string,
    input: TransactionInput
  ) => {
    if (!userId) throw new Error("No autenticado");

    const existing = transactions.find((t) => t.client_id === clientId);
    if (!existing) throw new Error("Movimiento no encontrado");

    let investment_asset_id = existing.investment_asset_id ?? null;
    if (input.type === "investment") {
      investment_asset_id = await resolveInvestmentAssetId(
        userId,
        input.category_id,
        input.currency_code
      );
    } else {
      investment_asset_id = null;
    }

    const tx: LocalTransaction = {
      ...existing,
      account_id: input.account_id,
      to_account_id:
        input.type === "transfer" ? (input.to_account_id ?? null) : null,
      category_id: input.type === "transfer" ? null : input.category_id,
      investment_asset_id,
      type: input.type,
      amount_cents: input.amount_cents,
      currency_code: input.currency_code,
      original_amount_cents: input.original_amount_cents ?? input.amount_cents,
      exchange_rate: input.exchange_rate ?? null,
      converted_amount_cents: input.converted_amount_cents ?? null,
      exchange_rate_source: input.exchange_rate_source ?? null,
      transaction_date: input.transaction_date,
      description: input.description ?? null,
      updated_at: new Date().toISOString(),
      _syncStatus: "pending",
    };

    await updateLocalTransaction(tx);
    const next = sortTransactions(
      transactions.map((t) => (t.client_id === clientId ? tx : t))
    );
    setTransactions(next);

    if (navigator.onLine) {
      const remoteId = await upsertRemoteTransaction(userId, tx);
      const reconciled = await reconcileLocalTransactionId(tx, remoteId);
      const reconciledNext = sortTransactions(
        next.map((t) => (t.client_id === clientId ? reconciled : t))
      );
      setTransactions(reconciledNext);
      if (
        input.type === "investment" ||
        existing.type === "investment"
      ) {
        await syncInvestmentAssetsIfNeeded(userId, reconciledNext);
      }
      return reconciled;
    }

    return tx;
  };

  const removeTransaction = async (clientId: string) => {
    if (!userId) throw new Error("No autenticado");

    const existing = transactions.find((t) => t.client_id === clientId);
    if (!existing) throw new Error("Movimiento no encontrado");

    await deleteLocalTransaction(existing);
    const next = transactions.filter((t) => t.client_id !== clientId);
    setTransactions(next);

    if (navigator.onLine) {
      await deleteRemoteTransaction(userId, clientId);
      if (existing.type === "investment") {
        await syncInvestmentAssetsIfNeeded(userId, next);
      }
    }
  };

  const getTransactionByClientId = useCallback(
    (clientId: string) =>
      transactions.find((t) => t.client_id === clientId) ?? null,
    [transactions]
  );

  return {
    transactions: userId ? transactions : [],
    loading,
    refresh,
    addTransaction,
    editTransaction,
    removeTransaction,
    getTransactionByClientId,
  };
}
