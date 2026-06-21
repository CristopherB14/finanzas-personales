"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecurringExpenseForm } from "@/components/recurring/recurring-expense-form";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useRecurringExpenses } from "@/hooks/use-recurring-expenses";

export default function EditarGastoRecurrentePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const { transactions } = useTransactions(user?.id);
  const { accounts, addAccount } = useAccounts(user?.id);
  const {
    categories,
    expenseCategories,
    getSubcategoriesFor,
    addCategory,
    addSubcategory,
  } = useCategories(user?.id, transactions);
  const {
    loading,
    getRecurringById,
    editRecurringExpense,
    removeRecurringExpense,
  } = useRecurringExpenses(user?.id);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const expense = getRecurringById(id);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  if (loading) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  if (!expense) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          No se encontró el gasto recurrente.
        </p>
        <Link
          href="/gastos-recurrentes"
          className="text-emerald-700 hover:underline"
        >
          Volver a gastos recurrentes
        </Link>
      </div>
    );
  }

  return (
    <RecurringExpenseForm
      key={expense.id}
      mode="edit"
      initial={expense}
      accounts={accounts}
      categories={expenseCategories}
      allCategories={categories}
      getSubcategoriesFor={getSubcategoriesFor}
      currency={expense.currency_code}
      deleteError={deleteError}
      onSubmit={async (data) => {
        await editRecurringExpense(id, data);
      }}
      onCreateAccount={addAccount}
      onCreateCategory={(data) => addCategory(data)}
      onCreateSubcategory={(parentId, data) => addSubcategory(parentId, data)}
      onDelete={async () => {
        setDeleteError(null);
        try {
          await removeRecurringExpense(id);
          router.push("/gastos-recurrentes");
          router.refresh();
        } catch {
          setDeleteError("No se pudo eliminar el gasto recurrente.");
        }
      }}
    />
  );
}
