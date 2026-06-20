"use client";

import { TransactionForm } from "@/components/transactions/transaction-form";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";

export default function NuevoGastoPage() {
  const { user } = useUser();
  const { transactions, addTransaction } = useTransactions(user?.id);
  const { accounts, addAccount } = useAccounts(user?.id);
  const {
    categories,
    expenseCategories,
    getSubcategoriesFor,
    loading,
    addCategory,
    addSubcategory,
  } = useCategories(user?.id, transactions);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  if (loading) {
    return <p className="text-slate-500">Cargando…</p>;
  }

  return (
    <TransactionForm
      mode="create"
      type="expense"
      accounts={accounts}
      categories={expenseCategories}
      allCategories={categories}
      getSubcategoriesFor={getSubcategoriesFor}
      currency="ARS"
      onSubmit={async (data) => {
        await addTransaction(data);
      }}
      onCreateAccount={addAccount}
      onCreateCategory={(data) => addCategory(data)}
      onCreateSubcategory={(parentId, data) => addSubcategory(parentId, data)}
    />
  );
}
