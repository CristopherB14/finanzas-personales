"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { isCashAccountType } from "@/lib/data/accounts";

export default function EditarInversionPage({
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
    investmentCategories,
    getSubcategoriesFor,
    addCategory,
    addSubcategory,
  } = useCategories(user?.id, transactions);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const transaction = getTransactionByClientId(clientId);
  const cashAccounts = accounts.filter((a) => isCashAccountType(a.type));

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  if (loading) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  if (!transaction || transaction.type !== "investment") {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">No se encontró la inversión.</p>
        <Link href="/inversiones" className="text-emerald-700 hover:underline">
          Volver a inversiones
        </Link>
      </div>
    );
  }

  return (
    <TransactionForm
      key={transaction.client_id}
      mode="edit"
      type="investment"
      initial={transaction}
      accounts={cashAccounts}
      categories={investmentCategories}
      allCategories={categories}
      getSubcategoriesFor={getSubcategoriesFor}
      currency={transaction.currency_code}
      deleteError={deleteError}
      onSubmit={async (data) => {
        await editTransaction(clientId, data);
      }}
      onCreateAccount={addAccount}
      onCreateCategory={(data) => addCategory({ ...data, type: "investment" })}
      onCreateSubcategory={(parentId, data) => addSubcategory(parentId, data)}
      onDelete={async () => {
        setDeleteError(null);
        try {
          await removeTransaction(clientId);
          router.push("/inversiones");
          router.refresh();
        } catch {
          setDeleteError("No se pudo eliminar la inversión.");
        }
      }}
    />
  );
}
