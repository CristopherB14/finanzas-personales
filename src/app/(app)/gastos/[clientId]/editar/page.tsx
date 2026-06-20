"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";

export default function EditarGastoPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const { transactions, loading, editTransaction, removeTransaction, getTransactionByClientId } =
    useTransactions(user?.id);
  const { accounts, addAccount } = useAccounts(user?.id);
  const {
    categories,
    expenseCategories,
    getSubcategoriesFor,
    addCategory,
    addSubcategory,
  } = useCategories(user?.id, transactions);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const transaction = getTransactionByClientId(clientId);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  if (loading) {
    return <p className="text-slate-500">Cargando…</p>;
  }

  if (!transaction || transaction.type !== "expense") {
    return (
      <div className="space-y-4">
        <p className="text-slate-500">No se encontró el gasto.</p>
        <Link href="/gastos" className="text-emerald-700 hover:underline">
          Volver a gastos
        </Link>
      </div>
    );
  }

  return (
    <TransactionForm
      key={transaction.client_id}
      mode="edit"
      type="expense"
      initial={transaction}
      accounts={accounts}
      categories={expenseCategories}
      allCategories={categories}
      getSubcategoriesFor={getSubcategoriesFor}
      currency={transaction.currency_code}
      deleteError={deleteError}
      onSubmit={async (data) => {
        await editTransaction(clientId, data);
      }}
      onCreateAccount={addAccount}
      onCreateCategory={(data) => addCategory(data)}
      onCreateSubcategory={(parentId, data) => addSubcategory(parentId, data)}
      onDelete={async () => {
        setDeleteError(null);
        try {
          await removeTransaction(clientId);
          router.push("/gastos");
          router.refresh();
        } catch {
          setDeleteError("No se pudo eliminar el gasto.");
        }
      }}
    />
  );
}
