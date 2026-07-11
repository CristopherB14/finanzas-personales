import Dexie, { type EntityTable } from "dexie";
import type {
  Account,
  Category,
  LocalTransaction,
  Transaction,
} from "@/types/database";

export interface SyncQueueItem {
  id?: number;
  table: "transactions" | "accounts" | "categories";
  operation: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  client_id: string;
  created_at: string;
  retries: number;
}

class FinanzasDB extends Dexie {
  transactions!: EntityTable<LocalTransaction, "id">;
  accounts!: EntityTable<Account, "id">;
  categories!: EntityTable<Category, "id">;
  syncQueue!: EntityTable<SyncQueueItem, "id">;
  meta!: EntityTable<{ key: string; value: string }, "key">;

  constructor() {
    super("finanzas-personales");
    this.version(1).stores({
      transactions:
        "id, user_id, account_id, category_id, type, transaction_date, client_id, _syncStatus",
      accounts: "id, user_id, client_id",
      categories: "id, user_id, type, client_id",
      syncQueue: "++id, client_id, created_at",
      meta: "key",
    });
    this.version(2).stores({
      transactions:
        "id, user_id, account_id, to_account_id, category_id, type, transaction_date, client_id, _syncStatus",
      accounts: "id, user_id, client_id",
      categories: "id, user_id, type, client_id",
      syncQueue: "++id, client_id, created_at",
      meta: "key",
    });
  }
}

export const localDb =
  typeof window !== "undefined" ? new FinanzasDB() : (null as unknown as FinanzasDB);

export async function getLocalTransactions(
  userId: string,
  from?: string,
  to?: string
): Promise<LocalTransaction[]> {
  if (!localDb) return [];
  const collection = localDb.transactions.where("user_id").equals(userId);
  const all = await collection.toArray();
  return all
    .filter((t) => {
      if (from && t.transaction_date < from) return false;
      if (to && t.transaction_date > to) return false;
      return true;
    })
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
}

export async function saveLocalTransaction(tx: LocalTransaction): Promise<void> {
  if (!localDb) return;
  await localDb.transactions.put({
    ...tx,
    _syncStatus: tx._syncStatus ?? "pending",
  });
  await enqueueSync("insert", tx);
}

export async function updateLocalTransaction(tx: LocalTransaction): Promise<void> {
  if (!localDb) return;
  const updated: LocalTransaction = {
    ...tx,
    updated_at: new Date().toISOString(),
    _syncStatus: "pending",
  };
  await localDb.transactions.put(updated);
  await enqueueSync("update", updated);
}

export async function deleteLocalTransaction(tx: LocalTransaction): Promise<void> {
  if (!localDb) return;
  await localDb.transactions.delete(tx.id);
  await enqueueSync("delete", tx);
}

/** Find a local transaction by client_id (stable across local/remote ids). */
export async function getLocalTransactionByClientId(
  clientId: string
): Promise<LocalTransaction | undefined> {
  if (!localDb) return undefined;
  return localDb.transactions.where("client_id").equals(clientId).first();
}

/**
 * After a successful remote upsert, rewrite the local row to use the remote id
 * and drop any ghost rows that share the same client_id.
 */
export async function reconcileLocalTransactionId(
  tx: LocalTransaction,
  remoteId: string
): Promise<LocalTransaction> {
  if (!localDb) return { ...tx, id: remoteId, _syncStatus: "synced" };

  const siblings = await localDb.transactions
    .where("client_id")
    .equals(tx.client_id)
    .toArray();

  for (const sibling of siblings) {
    if (sibling.id !== remoteId) {
      await localDb.transactions.delete(sibling.id);
    }
  }

  const reconciled: LocalTransaction = {
    ...tx,
    id: remoteId,
    _syncStatus: "synced",
    _localOnly: false,
  };
  await localDb.transactions.put(reconciled);
  await clearSyncQueueForClientId(tx.client_id);
  return reconciled;
}

export async function clearSyncQueueForClientId(clientId: string): Promise<void> {
  if (!localDb) return;
  await localDb.syncQueue.where("client_id").equals(clientId).delete();
}

/**
 * Keep a single local row per client_id. Prefers non-local-* ids, then newest.
 * Removes ghost duplicates created when remote UUIDs were merged alongside local-* rows.
 */
export async function dedupeLocalTransactionsByClientId(
  userId: string
): Promise<number> {
  if (!localDb) return 0;

  const all = await localDb.transactions.where("user_id").equals(userId).toArray();
  const byClientId = new Map<string, LocalTransaction[]>();

  for (const tx of all) {
    const group = byClientId.get(tx.client_id) ?? [];
    group.push(tx);
    byClientId.set(tx.client_id, group);
  }

  let removed = 0;
  for (const group of byClientId.values()) {
    if (group.length < 2) continue;

    const sorted = [...group].sort((a, b) => {
      const aLocal = a.id.startsWith("local-") ? 1 : 0;
      const bLocal = b.id.startsWith("local-") ? 1 : 0;
      if (aLocal !== bLocal) return aLocal - bLocal;
      return b.updated_at.localeCompare(a.updated_at);
    });

    const [, ...dupes] = sorted;
    for (const dupe of dupes) {
      await localDb.transactions.delete(dupe.id);
      removed += 1;
    }
  }

  return removed;
}

async function enqueueSync(
  operation: SyncQueueItem["operation"],
  tx: LocalTransaction
): Promise<void> {
  if (!localDb) return;
  await localDb.syncQueue.add({
    table: "transactions",
    operation,
    payload: tx as unknown as Record<string, unknown>,
    client_id: tx.client_id,
    created_at: new Date().toISOString(),
    retries: 0,
  });
}

/**
 * Merge remote rows into IndexedDB.
 * Matches by client_id (not only id) so local-* placeholders are replaced
 * instead of creating a second row for the same movement.
 */
export async function mergeRemoteTransactions(
  remote: Transaction[]
): Promise<void> {
  if (!localDb) return;
  for (const tx of remote) {
    const byClientId = await localDb.transactions
      .where("client_id")
      .equals(tx.client_id)
      .toArray();

    const pendingLocal = byClientId.find(
      (local) =>
        local._syncStatus === "pending" &&
        new Date(local.updated_at) > new Date(tx.updated_at)
    );

    if (pendingLocal) {
      // Keep newer unsynced local edits; drop other ghosts for this client_id.
      for (const local of byClientId) {
        if (local.id !== pendingLocal.id) {
          await localDb.transactions.delete(local.id);
        }
      }
      continue;
    }

    for (const local of byClientId) {
      if (local.id !== tx.id) {
        await localDb.transactions.delete(local.id);
      }
    }

    const existing = byClientId.find((local) => local.id === tx.id);
    if (!existing || new Date(tx.updated_at) >= new Date(existing.updated_at)) {
      await localDb.transactions.put({ ...tx, _syncStatus: "synced" });
    }
  }
}
