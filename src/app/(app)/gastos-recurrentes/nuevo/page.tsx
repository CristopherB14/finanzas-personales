"use client";

import { RecurringExpenseForm } from "@/components/recurring/recurring-expense-form";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useRecurringExpenses } from "@/hooks/use-recurring-expenses";

export default function NuevoGastoRecurrentePage() {
  const { user } = useUser();
  const { transactions } = useTransactions(user?.id);
  const { accounts, addAccount } = useAccounts(user?.id);
  const {
    categories,
    expenseCategories,
    getSubcategoriesFor,
    loading,
    addCategory,
    addSubcategory,
  } = useCategories(user?.id, transactions);
  const { addRecurringExpense } = useRecurringExpenses(user?.id);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  if (loading) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  return (
    <RecurringExpenseForm
      mode="create"
      accounts={accounts}
      categories={expenseCategories}
      allCategories={categories}
      getSubcategoriesFor={getSubcategoriesFor}
      currency="ARS"
      onSubmit={addRecurringExpense}
      onCreateAccount={addAccount}
      onCreateCategory={(data) => addCategory(data)}
      onCreateSubcategory={(parentId, data) => addSubcategory(parentId, data)}
    />
  );
}
