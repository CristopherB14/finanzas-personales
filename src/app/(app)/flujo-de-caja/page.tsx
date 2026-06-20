"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { formatCategoryLabel } from "@/lib/categories/helpers";
import { formatMoney } from "@/lib/format";
import { selectField, tableLink } from "@/lib/a11y";
import {
  buildCashFlowRows,
  cashFlowEditPath,
  defaultCashFlowFilters,
  type CashFlowTypeFilter,
} from "@/lib/finance/cash-flow";
import { cn } from "@/lib/utils";

export default function FlujoDeCajaPage() {
  const { user } = useUser();
  const { transactions, loading } = useTransactions(user?.id);
  const { accounts } = useAccounts(user?.id);
  const { categories } = useCategories(user?.id, transactions);
  const [filters, setFilters] = useState(defaultCashFlowFilters);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts]
  );
  const categoryLabel = (categoryId: string | null | undefined) =>
    formatCategoryLabel(categories, categoryId);

  const cashFlowCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.type === "income" ||
          c.type === "expense" ||
          c.type === "investment"
      ),
    [categories]
  );

  const { openingBalanceCents, rows } = useMemo(
    () => buildCashFlowRows(transactions, filters),
    [transactions, filters]
  );

  const closingBalanceCents =
    rows.length > 0
      ? rows[rows.length - 1].runningBalanceCents
      : openingBalanceCents;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Flujo de caja</h1>
        <p className="text-sm text-muted-foreground">
          Ingresos y gastos ordenados por fecha con saldo acumulado. Las
          transacciones programadas no están disponibles aún.
        </p>
      </header>

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="fromDate">Desde</Label>
            <Input
              id="fromDate"
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, fromDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="toDate">Hasta</Label>
            <Input
              id="toDate"
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, toDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account">Cuenta</Label>
            <select
              id="account"
              value={filters.accountId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, accountId: e.target.value }))
              }
              className={selectField}
            >
              <option value="">Todas las cuentas</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="typeFilter">Tipo</Label>
            <select
              id="typeFilter"
              value={filters.typeFilter}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  typeFilter: e.target.value as CashFlowTypeFilter,
                }))
              }
              className={selectField}
            >
              <option value="all">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
              <option value="investment">Inversiones</option>
              <option value="transfer">Transferencias</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <select
              id="category"
              value={filters.categoryId}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  categoryId: e.target.value,
                }))
              }
              className={selectField}
            >
              <option value="">Todas las categorías</option>
              {cashFlowCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Saldo inicial del período</p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                openingBalanceCents >= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              )}
            >
              {formatMoney(openingBalanceCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Saldo final del período</p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                closingBalanceCents >= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              )}
            >
              {formatMoney(closingBalanceCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading && <p className="text-muted-foreground">Cargando…</p>}

      {!loading && rows.length === 0 && (
        <p className="text-muted-foreground">
          No hay movimientos en el rango seleccionado.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Cuenta</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ transaction, deltaCents, runningBalanceCents, isFuture }) => (
              <tr
                key={transaction.client_id}
                className={cn(
                  "border-t border-slate-100 dark:border-slate-800",
                  isFuture && "bg-slate-50/80 dark:bg-slate-900/50"
                )}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  {format(new Date(transaction.transaction_date), "d MMM yyyy", {
                    locale: es,
                  })}
                  {isFuture && (
                    <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">
                      Futuro
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={cashFlowEditPath(transaction)}
                    className={tableLink}
                  >
                    {transaction.description ||
                      (transaction.type === "expense"
                        ? "Gasto"
                        : transaction.type === "investment"
                          ? "Inversión"
                          : transaction.type === "transfer"
                            ? "Transferencia"
                            : "Ingreso")}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {transaction.category_id
                    ? categoryLabel(transaction.category_id) || "—"
                    : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {transaction.type === "transfer" && transaction.to_account_id
                    ? `${accountMap.get(transaction.account_id) ?? "—"} → ${accountMap.get(transaction.to_account_id) ?? "—"}`
                    : (accountMap.get(transaction.account_id) ?? "—")}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-medium tabular-nums",
                    transaction.type === "transfer"
                      ? "text-sky-700 dark:text-sky-400"
                      : deltaCents >= 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                  )}
                >
                  {transaction.type === "transfer" ? (
                    formatMoney(transaction.amount_cents, transaction.currency_code)
                  ) : (
                    <>
                      {deltaCents >= 0 ? "+" : "−"}
                      {formatMoney(Math.abs(deltaCents), transaction.currency_code)}
                    </>
                  )}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-semibold tabular-nums",
                    runningBalanceCents >= 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-red-700 dark:text-red-400"
                  )}
                >
                  {formatMoney(runningBalanceCents, transaction.currency_code)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
