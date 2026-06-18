"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createAccount,
  deleteAccount,
  fetchAccounts,
  updateAccount,
} from "@/lib/data/accounts";
import type { Account, AccountType } from "@/types/database";

export function useAccounts(userId: string | undefined) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = Boolean(userId) && dataLoading;

  const refresh = useCallback(async () => {
    if (!userId) return;
    const data = await fetchAccounts(userId);
    setAccounts(data);
    setDataLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void fetchAccounts(userId).then((data) => {
      if (!cancelled) {
        setAccounts(data);
        setDataLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addAccount = async (input: {
    name: string;
    description?: string;
    type: AccountType;
    icon?: string;
    color?: string;
    currency_code?: string;
  }) => {
    if (!userId) throw new Error("No autenticado");
    const account = await createAccount(userId, input);
    setAccounts((prev) =>
      [...prev, account].sort((a, b) => a.name.localeCompare(b.name))
    );
    return account;
  };

  const editAccount = async (
    accountId: string,
    input: {
      name: string;
      description?: string;
      type: AccountType;
      icon?: string;
      color?: string;
    }
  ) => {
    if (!userId) throw new Error("No autenticado");
    const account = await updateAccount(userId, accountId, input);
    setAccounts((prev) =>
      prev
        .map((a) => (a.id === accountId ? account : a))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    return account;
  };

  const removeAccount = async (accountId: string) => {
    if (!userId) throw new Error("No autenticado");
    const result = await deleteAccount(userId, accountId);
    if (result.ok) {
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    }
    return result;
  };

  return {
    accounts: userId ? accounts : [],
    loading,
    refresh,
    addAccount,
    editAccount,
    removeAccount,
  };
}
