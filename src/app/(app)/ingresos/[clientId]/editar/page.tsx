"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";

export default function EditarIngresoPage({
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
    incomeCategories,
    getSubcategoriesFor,
    addCategory,
    addSubcategory,
  } = useCategories(user?.id, transactions);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const transaction = getTransactionByClientId(clientId);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  if (loading) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  if (!transaction || transaction.type !== "income") {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">No se encontró el ingreso.</p>
        <Link href="/ingresos" className="text-emerald-700 hover:underline">
          Volver a ingresos
        </Link>
      </div>
    );
  }

  return (
    <TransactionForm
      key={transaction.client_id}
      mode="edit"
      type="income"
      initial={transaction}
      accounts={accounts}
      categories={incomeCategories}
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
          router.push("/ingresos");
          router.refresh();
        } catch {
          setDeleteError("No se pudo eliminar el ingreso.");
        }
      }}
    />
  );
}
