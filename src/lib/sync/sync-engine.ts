import { createClient } from "@/lib/supabase/client";
import {
  dedupeLocalTransactionsByClientId,
  localDb,
  mergeRemoteTransactions,
  reconcileLocalTransactionId,
} from "@/lib/db/local-db";
import type { LocalTransaction } from "@/types/database";

export type SyncState = "idle" | "syncing" | "offline" | "error";

let listeners: ((state: SyncState) => void)[] = [];
let completeListeners: (() => void)[] = [];
let activeSyncCleanup: (() => void) | null = null;
let activeSyncUserId: string | null = null;
/** Prevent overlapping sync runs for the same user. */
let syncInFlight: Promise<void> | null = null;

export function onSyncStateChange(cb: (state: SyncState) => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function notifySyncComplete() {
  notifyComplete();
}

export function onSyncComplete(cb: () => void) {
  completeListeners.push(cb);
  return () => {
    completeListeners = completeListeners.filter((l) => l !== cb);
  };
}

function notify(state: SyncState) {
  listeners.forEach((l) => l(state));
}

function notifyComplete() {
  completeListeners.forEach((l) => l());
}

function remoteTransactionId(tx: LocalTransaction): string {
  return tx.id.startsWith("local-") ? tx.client_id : tx.id;
}

export async function pushPendingChanges(userId: string): Promise<void> {
  if (!localDb || !navigator.onLine) {
    notify("offline");
    return;
  }

  notify("syncing");
  const supabase = createClient();
  const queue = await localDb.syncQueue.orderBy("created_at").toArray();

  for (const item of queue) {
    if (item.table !== "transactions") continue;

    if (item.operation === "delete") {
      const payload = item.payload as { client_id?: string };
      if (!payload.client_id) continue;

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("user_id", userId)
        .eq("client_id", payload.client_id);

      if (error) {
        notify("error");
        throw error;
      }

      await localDb.syncQueue.delete(item.id!);
      continue;
    }

    const tx = item.payload as unknown as LocalTransaction;
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

    if (error) {
      notify("error");
      throw error;
    }

    await localDb.syncQueue.delete(item.id!);
    await reconcileLocalTransactionId(tx, data?.id ?? remoteId);
  }

  notify("idle");
}

export async function pullRemoteChanges(userId: string): Promise<void> {
  if (!navigator.onLine) return;

  const supabase = createClient();
  const since = await localDb?.meta.get("lastSync");
  const query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (since?.value) {
    query.gte("updated_at", since.value);
  }

  const { data, error } = await query;
  if (error) throw error;

  if (data?.length) {
    await mergeRemoteTransactions(data);
  }

  await dedupeLocalTransactionsByClientId(userId);

  await localDb?.meta.put({
    key: "lastSync",
    value: new Date().toISOString(),
  });
}

export async function syncAll(userId: string): Promise<void> {
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    try {
      await pushPendingChanges(userId);
      await pullRemoteChanges(userId);
      notify("idle");
      notifyComplete();
    } catch {
      notify("error");
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

export function startAutoSync(userId: string, intervalMs = 60000) {
  if (activeSyncUserId === userId && activeSyncCleanup) {
    return activeSyncCleanup;
  }

  activeSyncCleanup?.();
  activeSyncUserId = userId;

  const run = () => {
    if (navigator.onLine) void syncAll(userId);
    else notify("offline");
  };

  run();
  window.addEventListener("online", run);
  const interval = setInterval(run, intervalMs);

  const cleanup = () => {
    window.removeEventListener("online", run);
    clearInterval(interval);
    if (activeSyncUserId === userId) {
      activeSyncUserId = null;
      activeSyncCleanup = null;
    }
  };

  activeSyncCleanup = cleanup;
  return cleanup;
}
