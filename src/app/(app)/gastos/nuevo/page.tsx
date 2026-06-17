"use client";

import { useEffect, useState } from "react";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { ensureUserSetup, fetchCategories } from "@/lib/data/seed-user";
import type { Category } from "@/types/database";

export default function NuevoGastoPage() {
  const { user } = useUser();
  const { addTransaction } = useTransactions(user?.id);
  const { accounts } = useAccounts(user?.id);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      await ensureUserSetup(user.id);
      setCategories(await fetchCategories(user.id, "expense"));
    })();
  }, [user?.id]);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  return (
    <TransactionForm
      type="expense"
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
