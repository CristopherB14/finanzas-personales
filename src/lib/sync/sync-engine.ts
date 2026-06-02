import { createClient } from "@/lib/supabase/client";
import { localDb, mergeRemoteTransactions } from "@/lib/db/local-db";
import type { LocalTransaction } from "@/types/database";

export type SyncState = "idle" | "syncing" | "offline" | "error";

let listeners: ((state: SyncState) => void)[] = [];

export function onSyncStateChange(cb: (state: SyncState) => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function notify(state: SyncState) {
  listeners.forEach((l) => l(state));
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
    const tx = item.payload as unknown as LocalTransaction;

    const { error } = await supabase.from("transactions").upsert(
      {
        id: tx.id.startsWith("local-") ? undefined : tx.id,
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
  } catch {
    notify("error");
  }
}

export function startAutoSync(userId: string, intervalMs = 30000) {
  const run = () => {
    if (navigator.onLine) void syncAll(userId);
    else notify("offline");
  };

  run();
  window.addEventListener("online", run);
  const interval = setInterval(run, intervalMs);

  return () => {
    window.removeEventListener("online", run);
    clearInterval(interval);
  };
}
