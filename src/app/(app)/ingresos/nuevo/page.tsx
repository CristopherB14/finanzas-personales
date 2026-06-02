"use client";

import { useEffect, useState } from "react";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import {
  ensureUserSetup,
  fetchAccounts,
  fetchCategories,
} from "@/lib/data/seed-user";
import type { Account, Category } from "@/types/database";

export default function NuevoIngresoPage() {
  const { user } = useUser();
  const { addTransaction } = useTransactions(user?.id);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      await ensureUserSetup(user.id);
      setAccounts(await fetchAccounts(user.id));
      setCategories(await fetchCategories(user.id, "income"));
    })();
  }, [user?.id]);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  return (
    <TransactionForm
      type="income"
      userId={user.id}
      accounts={accounts}
      categories={categories}
      currency="ARS"
      onSubmit={async (data) => {
        await addTransaction(data);
      }}
    />
  );
}
