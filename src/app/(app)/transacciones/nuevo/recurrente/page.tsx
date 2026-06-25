"use client";

import Link from "next/link";
import { RecurringExpenseForm } from "@/components/recurring/recurring-expense-form";
import { ROUTES } from "@/constants/routes";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useRecurringExpenses } from "@/hooks/use-recurring-expenses";
import { useGoogleCalendar } from "@/hooks/use-google-calendar";

export default function NuevaTransaccionRecurrentePage() {
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
    editCategory,
    editSubcategory,
    removeCategory,
    removeSubcategory,
  } = useCategories(user?.id, transactions);
  const { addRecurringExpense } = useRecurringExpenses(user?.id);
  const { connected: googleCalendarConnected } = useGoogleCalendar();

  if (!user) return <p>Iniciá sesión para continuar.</p>;
  if (loading) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link href={ROUTES.newTransaction} className="text-accent hover:underline">
          ← Elegir otro tipo
        </Link>
      </p>
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
        onEditCategory={editCategory}
        onDeleteCategory={removeCategory}
        onEditSubcategory={editSubcategory}
        onDeleteSubcategory={removeSubcategory}
        googleCalendarConnected={googleCalendarConnected}
      />
    </div>
  );
}
