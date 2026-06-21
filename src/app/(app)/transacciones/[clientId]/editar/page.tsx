"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { ROUTES } from "@/constants/routes";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";

export default function EditarTransaccionPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const {
    transactions,
    loading,
    editTransaction,
    removeTransaction,
    getTransactionByClientId,
  } = useTransactions(user?.id);
  const { accounts, addAccount } = useAccounts(user?.id);
  const {
    categories,
    expenseCategories,
    incomeCategories,
    getSubcategoriesFor,
    addCategory,
    addSubcategory,
    editCategory,
    editSubcategory,
    removeCategory,
    removeSubcategory,
  } = useCategories(user?.id, transactions);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const transaction = getTransactionByClientId(clientId);

  if (!user) return <p>Iniciá sesión para continuar.</p>;
  if (loading) return <p className="text-muted-foreground">Cargando…</p>;

  if (
    !transaction ||
    (transaction.type !== "income" && transaction.type !== "expense")
  ) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">No se encontró la transacción.</p>
        <Link href={ROUTES.transactions} className="text-accent hover:underline">
          Volver a transacciones
        </Link>
      </div>
    );
  }

  const formCategories =
    transaction.type === "expense" ? expenseCategories : incomeCategories;

  return (
    <TransactionForm
      key={transaction.client_id}
      mode="edit"
      type={transaction.type}
      initial={transaction}
      accounts={accounts}
      categories={formCategories}
      allCategories={categories}
      getSubcategoriesFor={getSubcategoriesFor}
      currency={transaction.currency_code}
      listPath={ROUTES.transactions}
      deleteError={deleteError}
      onSubmit={async (data) => {
        await editTransaction(clientId, data);
      }}
      onCreateAccount={addAccount}
      onCreateCategory={(data) => addCategory(data)}
      onCreateSubcategory={(parentId, data) => addSubcategory(parentId, data)}
      onEditCategory={editCategory}
      onDeleteCategory={removeCategory}
      onEditSubcategory={editSubcategory}
      onDeleteSubcategory={removeSubcategory}
      onDelete={async () => {
        setDeleteError(null);
        try {
          await removeTransaction(clientId);
          router.push(ROUTES.transactions);
          router.refresh();
        } catch {
          setDeleteError("No se pudo eliminar la transacción.");
        }
      }}
    />
  );
}
