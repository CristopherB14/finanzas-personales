"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useRecurringExpenses } from "@/hooks/use-recurring-expenses";
import { formatCategoryLabel } from "@/lib/categories/helpers";
import { getFrequencyLabel } from "@/lib/recurrence/engine";
import { formatMoney } from "@/lib/format";
import type { RecurringExpense } from "@/types/database";

function StatusBadge({
  overdue,
  active,
}: {
  overdue: boolean;
  active: boolean;
}) {
  if (!active) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        Inactivo
      </span>
    );
  }
  if (overdue) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
        Vencido
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
      Próximo
    </span>
  );
}

function RecurringExpenseCard({
  expense,
  categoryLabel,
  accountName,
  overdue,
  onConfirm,
  confirming,
}: {
  expense: RecurringExpense;
  categoryLabel: string;
  accountName: string;
  overdue: boolean;
  onConfirm?: () => void;
  confirming?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{expense.name}</p>
            <StatusBadge overdue={overdue} active={expense.is_active} />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatMoney(expense.amount_cents, expense.currency_code)}
            {categoryLabel && ` · ${categoryLabel}`}
            {accountName && ` · ${accountName}`}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="h-3 w-3" />
            Próximo:{" "}
            {format(new Date(expense.next_due_date), "d MMM yyyy", {
              locale: es,
            })}
            {" · "}
            {getFrequencyLabel(expense.frequency, expense.recurrence_rule)}
          </p>
          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {expense.auto_create && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                Auto-crear
              </span>
            )}
            {expense.reminder_enabled && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                Recordatorio
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {!expense.auto_create &&
            expense.is_active &&
            overdue &&
            onConfirm && (
              <Button
                size="sm"
                variant="outline"
                disabled={confirming}
                onClick={onConfirm}
              >
                {confirming ? "Confirmando…" : "Confirmar gasto"}
              </Button>
            )}
          <Button asChild variant="ghost" size="sm" className="h-8 px-2">
            <Link href={`/gastos-recurrentes/${expense.id}/editar`}>
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GastosRecurrentesPage() {
  const { user } = useUser();
  const { transactions, addTransaction } = useTransactions(user?.id);
  const { accounts } = useAccounts(user?.id);
  const { categories } = useCategories(user?.id, transactions);
  const {
    overdue,
    upcoming,
    inactive,
    loading,
    confirmOccurrence,
  } = useRecurringExpenses(user?.id);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts]
  );
  const categoryLabel = (categoryId: string) =>
    formatCategoryLabel(categories, categoryId);

  const clientIds = useMemo(
    () => new Set(transactions.map((t) => t.client_id)),
    [transactions]
  );

  const handleConfirm = async (id: string) => {
    setConfirmingId(id);
    try {
      await confirmOccurrence(id, addTransaction, clientIds);
    } finally {
      setConfirmingId(null);
    }
  };

  const totalActive = overdue.length + upcoming.length;
  const isEmpty = totalActive === 0 && inactive.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Gastos programados y suscripciones
          </p>
          <h1 className="text-2xl font-bold">Gastos recurrentes</h1>
        </div>
        <Button asChild size="sm">
          <Link href="/gastos-recurrentes/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo
          </Link>
        </Button>
      </header>

      {loading && <p className="text-muted-foreground">Cargando…</p>}

      {!loading && isEmpty && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Todavía no tenés gastos recurrentes configurados.
            </p>
            <Button asChild className="mt-4">
              <Link href="/gastos-recurrentes/nuevo">
                Crear gasto recurrente
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && overdue.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
            Vencidos ({overdue.length})
          </h2>
          <ul className="space-y-2">
            {overdue.map((expense) => (
              <li key={expense.id}>
                <RecurringExpenseCard
                  expense={expense}
                  categoryLabel={categoryLabel(expense.category_id)}
                  accountName={accountMap.get(expense.account_id) ?? ""}
                  overdue
                  onConfirm={
                    !expense.auto_create
                      ? () => void handleConfirm(expense.id)
                      : undefined
                  }
                  confirming={confirmingId === expense.id}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Próximos ({upcoming.length})
          </h2>
          <ul className="space-y-2">
            {upcoming.map((expense) => (
              <li key={expense.id}>
                <RecurringExpenseCard
                  expense={expense}
                  categoryLabel={categoryLabel(expense.category_id)}
                  accountName={accountMap.get(expense.account_id) ?? ""}
                  overdue={false}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && inactive.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Inactivos ({inactive.length})
          </h2>
          <ul className="space-y-2">
            {inactive.map((expense) => (
              <li key={expense.id}>
                <RecurringExpenseCard
                  expense={expense}
                  categoryLabel={categoryLabel(expense.category_id)}
                  accountName={accountMap.get(expense.account_id) ?? ""}
                  overdue={false}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
