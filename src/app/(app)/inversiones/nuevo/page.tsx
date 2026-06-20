"use client";

import { TransactionForm } from "@/components/transactions/transaction-form";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { isCashAccountType } from "@/lib/data/accounts";

export default function NuevaInversionPage() {
  const { user } = useUser();
  const { transactions, addTransaction } = useTransactions(user?.id);
  const { accounts, addAccount } = useAccounts(user?.id);
  const {
    categories,
    investmentCategories,
    getSubcategoriesFor,
    loading,
    addCategory,
    addSubcategory,
  } = useCategories(user?.id, transactions);

  const cashAccounts = accounts.filter((a) => isCashAccountType(a.type));

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  if (loading) {
    return <p className="text-slate-500">Cargando…</p>;
  }

  return (
    <TransactionForm
      mode="create"
      type="investment"
      accounts={cashAccounts}
      categories={investmentCategories}
      allCategories={categories}
      getSubcategoriesFor={getSubcategoriesFor}
      currency="ARS"
      onSubmit={async (data) => {
        await addTransaction(data);
      }}
      onCreateAccount={addAccount}
      onCreateCategory={(data) => addCategory({ ...data, type: "investment" })}
      onCreateSubcategory={(parentId, data) => addSubcategory(parentId, data)}
    />
  );
}
