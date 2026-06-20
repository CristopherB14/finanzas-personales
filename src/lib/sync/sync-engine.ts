import { createClient } from "@/lib/supabase/client";
import { localDb, mergeRemoteTransactions } from "@/lib/db/local-db";
import type { LocalTransaction } from "@/types/database";

export type SyncState = "idle" | "syncing" | "offline" | "error";

let listeners: ((state: SyncState) => void)[] = [];
let completeListeners: (() => void)[] = [];
let activeSyncCleanup: (() => void) | null = null;
let activeSyncUserId: string | null = null;

export function onSyncStateChange(cb: (state: SyncState) => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
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

    const { error } = await supabase.from("transactions").upsert(
      {
        id: tx.id.startsWith("local-") ? undefined : tx.id,
        user_id: userId,
        account_id: tx.account_id,
        category_id: tx.category_id,
        investment_asset_id: tx.investment_asset_id ?? null,
        type: tx.type,
        amount_cents: tx.amount_cents,
        currency_code: tx.currency_code,
        transaction_date: tx.transaction_date,
        description: tx.description,
        tags: tx.tags,
        client_id: tx.client_id,
      },
      { onConflict: "user_id,client_id" }
    );

    if (error) {
      notify("error");
      throw error;
    }

    await localDb.syncQueue.delete(item.id!);
    await localDb.transactions.update(tx.id, { _syncStatus: "synced" });
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

  await localDb?.meta.put({
    key: "lastSync",
    value: new Date().toISOString(),
  });
}

export async function syncAll(userId: string): Promise<void> {
  try {
    await pushPendingChanges(userId);
    await pullRemoteChanges(userId);
    notify("idle");
    notifyComplete();
  } catch {
    notify("error");
  }
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
