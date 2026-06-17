import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import { getAccountTypeOption } from "@/constants/accounts";
import { getLocalTransactions, localDb } from "@/lib/db/local-db";
import type { Account, AccountType, Transaction } from "@/types/database";

export async function fetchAccounts(userId: string): Promise<Account[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  return data ?? [];
}

export async function createAccount(
  userId: string,
  input: {
    name: string;
    description?: string;
    type: AccountType;
    icon?: string;
    color?: string;
    currency_code?: string;
  }
): Promise<Account> {
  const supabase = createClient();
  const defaults = getAccountTypeOption(input.type);

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      icon: input.icon ?? defaults.icon,
      color: input.color ?? defaults.color,
      balance_cents: 0,
      currency_code: input.currency_code ?? "ARS",
      is_default: false,
      client_id: uuidv4(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAccount(
  userId: string,
  accountId: string,
  input: {
    name: string;
    description?: string;
    type: AccountType;
    icon?: string;
    color?: string;
  }
): Promise<Account> {
  const supabase = createClient();
  const defaults = getAccountTypeOption(input.type);

  const { data, error } = await supabase
    .from("accounts")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      icon: input.icon ?? defaults.icon,
      color: input.color ?? defaults.color,
    })
    .eq("id", accountId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAccount(
  userId: string,
  accountId: string
): Promise<{ ok: true } | { ok: false; reason: "has_transactions" }> {
  const count = await getTransactionCountByAccount(userId, accountId);
  if (count > 0) {
    return { ok: false, reason: "has_transactions" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", userId);

  if (error) throw error;
  return { ok: true };
}

export async function getTransactionCountByAccount(
  userId: string,
  accountId: string
): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("account_id", accountId);

  if (error) throw error;
  return count ?? 0;
}

export async function migrateOrphanTransactions(userId: string): Promise<void> {
  const supabase = createClient();
  const accounts = await fetchAccounts(userId);
  const accountIds = new Set(accounts.map((a) => a.id));

  const localTransactions = await getLocalTransactions(userId);
  const { data: remoteTransactions } = await supabase
    .from("transactions")
    .select("id, account_id, client_id")
    .eq("user_id", userId);

  const allTransactions = new Map<string, { id: string; account_id: string }>();
  for (const t of remoteTransactions ?? []) {
    allTransactions.set(t.client_id ?? t.id, t);
  }
  for (const t of localTransactions) {
    allTransactions.set(t.client_id, {
      id: t.id,
      account_id: t.account_id,
    });
  }

  const orphans = Array.from(allTransactions.values()).filter(
    (t) => !accountIds.has(t.account_id)
  );

  if (orphans.length === 0) return;

  let generalAccount = accounts.find((a) => a.name === "General");

  if (!generalAccount) {
    generalAccount = await createAccount(userId, {
      name: "General",
      description: "Cuenta creada automáticamente para movimientos sin cuenta asignada",
      type: "other",
    });
  }

  const remoteOrphanIds = orphans
    .filter((t) => !t.id.startsWith("local-"))
    .map((t) => t.id);

  if (remoteOrphanIds.length > 0) {
    await supabase
      .from("transactions")
      .update({ account_id: generalAccount.id })
      .in("id", remoteOrphanIds);
  }

  for (const t of localTransactions) {
    if (!accountIds.has(t.account_id)) {
      await localDb?.transactions.put({
        ...t,
        account_id: generalAccount.id,
        updated_at: new Date().toISOString(),
        _syncStatus: t._syncStatus === "synced" ? "pending" : t._syncStatus,
      });
    }
  }
}

export function accountBalanceFromTransactions(
  accountId: string,
  transactions: Transaction[]
): number {
  return transactions.reduce((sum, t) => {
    if (t.account_id !== accountId) return sum;
    if (t.type === "income") return sum + t.amount_cents;
    if (t.type === "expense") return sum - t.amount_cents;
    return sum;
  }, 0);
}

export function transactionCountByAccount(
  accountId: string,
  transactions: Transaction[]
): number {
  return transactions.filter((t) => t.account_id === accountId).length;
}

export function totalBalanceFromTransactions(
  transactions: Transaction[]
): number {
  return transactions.reduce((sum, t) => {
    if (t.type === "income") return sum + t.amount_cents;
    if (t.type === "expense") return sum - t.amount_cents;
    return sum;
  }, 0);
}
