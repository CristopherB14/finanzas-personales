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
  let collection = localDb.transactions.where("user_id").equals(userId);
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
  await localDb.syncQueue.add({
    table: "transactions",
    operation: "insert",
    payload: tx as unknown as Record<string, unknown>,
    client_id: tx.client_id,
    created_at: new Date().toISOString(),
    retries: 0,
  });
}

export async function mergeRemoteTransactions(
  remote: Transaction[]
): Promise<void> {
  if (!localDb) return;
  for (const tx of remote) {
    const local = await localDb.transactions.get(tx.id);
    if (!local) {
      await localDb.transactions.put({ ...tx, _syncStatus: "synced" });
      continue;
    }
    if (new Date(tx.updated_at) >= new Date(local.updated_at)) {
      await localDb.transactions.put({ ...tx, _syncStatus: "synced" });
    }
  }
}
