"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { formatMoney } from "@/lib/format";

export default function GastosPage() {
  const { user } = useUser();
  const { transactions, loading } = useTransactions(user?.id);
  const { accounts } = useAccounts(user?.id);
  const { expenseCategories } = useCategories(user?.id, transactions);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts]
  );
  const categoryMap = useMemo(
    () => new Map(expenseCategories.map((c) => [c.id, c.name])),
    [expenseCategories]
  );

  const gastos = transactions.filter((t) => t.type === "expense");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gastos</h1>
        <Button asChild size="sm">
          <Link href="/gastos/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo
          </Link>
        </Button>
      </header>

      {loading && <p className="text-slate-500">Cargando…</p>}

      {!loading && gastos.length === 0 && (
        <p className="text-slate-500">No hay gastos registrados.</p>
      )}

      <ul className="space-y-2">
        {gastos.map((t) => (
          <li key={t.client_id}>
            <Card>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.description || "Gasto"}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(t.transaction_date), "d MMM yyyy", {
                      locale: es,
                    })}
                    {categoryMap.get(t.category_id ?? "") &&
                      ` · ${categoryMap.get(t.category_id ?? "")}`}
                    {accountMap.get(t.account_id) &&
                      ` · ${accountMap.get(t.account_id)}`}
                    {t._syncStatus === "pending" && " · Pendiente sync"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-red-600 tabular-nums">
                    −{formatMoney(t.amount_cents, t.currency_code)}
                  </p>
                  <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                    <Link href={`/gastos/${t.client_id}/editar`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
