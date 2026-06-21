"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  TransactionFiltersPanel,
  parseTransactionFilters,
} from "@/components/transactions/transaction-filters";
import { ROUTES } from "@/constants/routes";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useRecurringExpenses } from "@/hooks/use-recurring-expenses";
import { formatCategoryLabel } from "@/lib/categories/helpers";
import { getFrequencyLabel } from "@/lib/recurrence/engine";
import { formatMoney } from "@/lib/format";
import type { LocalTransaction } from "@/types/database";

function matchesTransactionFilters(
  tx: LocalTransaction,
  filters: ReturnType<typeof parseTransactionFilters>,
  categories: { id: string; parent_id: string | null }[]
): boolean {
  if (filters.type === "recurring") return false;
  if (filters.type === "income" && tx.type !== "income") return false;
  if (filters.type === "expense" && tx.type !== "expense") return false;
  if (filters.type === "all" && tx.type !== "income" && tx.type !== "expense") {
    return false;
  }

  if (filters.accountId && tx.account_id !== filters.accountId) return false;

  if (filters.subcategoryId) {
    if (tx.category_id !== filters.subcategoryId) return false;
  } else if (filters.categoryId) {
    const cat = categories.find((c) => c.id === tx.category_id);
    const matchesParent =
      tx.category_id === filters.categoryId ||
      cat?.parent_id === filters.categoryId;
    if (!matchesParent) return false;
  }

  if (filters.dateFrom && tx.transaction_date < filters.dateFrom) return false;
  if (filters.dateTo && tx.transaction_date > filters.dateTo) return false;

  return true;
}

function TransactionsPageContent() {
  const searchParams = useSearchParams();
  const filters = parseTransactionFilters(searchParams);
  const { user } = useUser();
  const { transactions, loading, addTransaction } = useTransactions(user?.id);
  const { accounts } = useAccounts(user?.id);
  const { categories } = useCategories(user?.id, transactions);
  const {
    expenses: recurringExpenses,
    loading: recurringLoading,
    confirmOccurrence,
  } = useRecurringExpenses(user?.id);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts]
  );
  const categoryLabel = (categoryId: string | null) =>
    formatCategoryLabel(categories, categoryId);

  const clientIds = useMemo(
    () => new Set(transactions.map((t) => t.client_id)),
    [transactions]
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((tx) =>
        matchesTransactionFilters(tx, filters, categories)
      ),
    [transactions, filters, categories]
  );

  const filteredRecurring = useMemo(() => {
    if (filters.type !== "recurring" && filters.type !== "all") return [];

    return recurringExpenses.filter((expense) => {
      if (filters.accountId && expense.account_id !== filters.accountId) {
        return false;
      }
      if (filters.subcategoryId) {
        if (expense.category_id !== filters.subcategoryId) return false;
      } else if (filters.categoryId) {
        const cat = categories.find((c) => c.id === expense.category_id);
        const matchesParent =
          expense.category_id === filters.categoryId ||
          cat?.parent_id === filters.categoryId;
        if (!matchesParent) return false;
      }
      if (filters.dateFrom && expense.next_due_date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && expense.next_due_date > filters.dateTo) {
        return false;
      }
      return true;
    });
  }, [recurringExpenses, filters, categories]);

  const showTransactions =
    filters.type === "all" ||
    filters.type === "income" ||
    filters.type === "expense";
  const showRecurring = filters.type === "all" || filters.type === "recurring";

  const hasResults =
    (showTransactions && filteredTransactions.length > 0) ||
    (showRecurring && filteredRecurring.length > 0);

  const isEmpty = !loading && !recurringLoading && !hasResults;

  const handleConfirmRecurring = async (id: string) => {
    setConfirmingId(id);
    try {
      await confirmOccurrence(id, addTransaction, clientIds);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Ingresos, gastos y recurrentes
          </p>
          <h1 className="text-2xl font-bold">Transacciones</h1>
        </div>
        <Button asChild size="sm">
          <Link href={ROUTES.newTransaction}>
            <Plus className="h-4 w-4" />
            Nueva transacción
          </Link>
        </Button>
      </header>

      <TransactionFiltersPanel
        filters={filters}
        categories={categories}
        accounts={accounts}
      />

      {(loading || recurringLoading) && (
        <p className="text-muted-foreground">Cargando…</p>
      )}

      {isEmpty && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No hay transacciones con estos filtros.
            </p>
            <Button asChild className="mt-4">
              <Link href={ROUTES.newTransaction}>Nueva transacción</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {showTransactions && filteredTransactions.length > 0 && (
        <section className="space-y-2">
          {filters.type === "all" && (
            <h2 className="text-sm font-semibold text-muted-foreground">
              Movimientos
            </h2>
          )}
          <ul className="space-y-2">
            {filteredTransactions.map((t) => (
              <li key={t.client_id}>
                <Card>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {t.description ||
                            (t.type === "income" ? "Ingreso" : "Gasto")}
                        </p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {t.type === "income" ? "Ingreso" : "Gasto"}
                        </span>
                        {t.recurring_expense_id && (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-400">
                            Recurrente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.transaction_date), "d MMM yyyy", {
                          locale: es,
                        })}
                        {categoryLabel(t.category_id) &&
                          ` · ${categoryLabel(t.category_id)}`}
                        {accountMap.get(t.account_id) &&
                          ` · ${accountMap.get(t.account_id)}`}
                        {t._syncStatus === "pending" && " · Pendiente sync"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-semibold tabular-nums ${
                          t.type === "income"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-red-700 dark:text-red-400"
                        }`}
                      >
                        {t.type === "income" ? "+" : "−"}
                        {formatMoney(t.amount_cents, t.currency_code)}
                      </p>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                      >
                        <Link href={ROUTES.editTransaction(t.client_id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showRecurring && filteredRecurring.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Gastos recurrentes
          </h2>
          <ul className="space-y-2">
            {filteredRecurring.map((expense) => {
              const overdue =
                expense.is_active &&
                expense.next_due_date <= format(new Date(), "yyyy-MM-dd");
              return (
                <li key={expense.id}>
                  <Card>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{expense.name}</p>
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-400">
                            Recurrente
                          </span>
                          {overdue && expense.is_active && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                              Vencido
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(expense.amount_cents, expense.currency_code)}
                          {categoryLabel(expense.category_id) &&
                            ` · ${categoryLabel(expense.category_id)}`}
                          {accountMap.get(expense.account_id) &&
                            ` · ${accountMap.get(expense.account_id)}`}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarClock className="h-3 w-3" />
                          Próximo:{" "}
                          {format(new Date(expense.next_due_date), "d MMM yyyy", {
                            locale: es,
                          })}
                          {" · "}
                          {getFrequencyLabel(
                            expense.frequency,
                            expense.recurrence_rule
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {!expense.auto_create &&
                          expense.is_active &&
                          overdue && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={confirmingId === expense.id}
                              onClick={() =>
                                void handleConfirmRecurring(expense.id)
                              }
                            >
                              {confirmingId === expense.id
                                ? "Confirmando…"
                                : "Confirmar gasto"}
                            </Button>
                          )}
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                        >
                          <Link href={ROUTES.editRecurring(expense.id)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function TransaccionesPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
      <TransactionsPageContent />
    </Suspense>
  );
}
