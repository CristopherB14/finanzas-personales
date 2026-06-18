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
import { formatMoney } from "@/lib/format";
import {
  buildCashFlowRows,
  defaultCashFlowFilters,
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
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const cashFlowCategories = useMemo(
    () => categories.filter((c) => c.type === "income" || c.type === "expense"),
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
        <p className="text-sm text-slate-500">
          Ingresos y gastos ordenados por fecha con saldo acumulado. Las
          transacciones programadas no están disponibles aún.
        </p>
      </header>

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
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
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
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
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
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
            <p className="text-xs text-slate-500">Saldo inicial del período</p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                openingBalanceCents >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
              )}
            >
              {formatMoney(openingBalanceCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Saldo final del período</p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                closingBalanceCents >= 0 ? "text-emerald-600" : "text-red-600"
              )}
            >
              {formatMoney(closingBalanceCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading && <p className="text-slate-500">Cargando…</p>}

      {!loading && rows.length === 0 && (
        <p className="text-slate-500">
          No hay movimientos en el rango seleccionado.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
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
                    <span className="ml-2 text-xs text-amber-600">Futuro</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={
                      transaction.type === "expense"
                        ? `/gastos/${transaction.client_id}/editar`
                        : `/ingresos/${transaction.client_id}/editar`
                    }
                    className="hover:text-emerald-700 hover:underline"
                  >
                    {transaction.description ||
                      (transaction.type === "expense" ? "Gasto" : "Ingreso")}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {transaction.category_id
                    ? categoryMap.get(transaction.category_id) ?? "—"
                    : "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {accountMap.get(transaction.account_id) ?? "—"}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-medium tabular-nums",
                    deltaCents >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {deltaCents >= 0 ? "+" : "−"}
                  {formatMoney(Math.abs(deltaCents), transaction.currency_code)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-semibold tabular-nums",
                    runningBalanceCents >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
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
