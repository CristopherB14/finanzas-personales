"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AccountIcon } from "@/components/accounts/account-icon";
import { useUser } from "@/hooks/use-user";
import { useAccounts } from "@/hooks/use-accounts";
import { useTransactions } from "@/hooks/use-transactions";
import {
  accountBalanceFromTransactions,
  transactionCountByAccount,
} from "@/lib/data/accounts";
import { formatMoney } from "@/lib/format";

export default function CuentasPage() {
  const { user } = useUser();
  const { accounts, loading } = useAccounts(user?.id);
  const { transactions } = useTransactions(user?.id);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description?.toLowerCase().includes(q) ?? false)
    );
  }, [accounts, search]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cuentas</h1>
        <Button asChild size="sm">
          <Link href="/cuentas/nueva">
            <Plus className="h-4 w-4" />
            Nueva
          </Link>
        </Button>
      </header>

      {accounts.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cuenta…"
            className="pl-10"
          />
        </div>
      )}

      {loading && <p className="text-slate-500">Cargando…</p>}

      {!loading && accounts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-slate-600">
              Todavía no tenés cuentas. Creá una para registrar tus movimientos.
            </p>
            <Button asChild className="mt-4">
              <Link href="/cuentas/nueva">Crear primera cuenta</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && accounts.length > 0 && filtered.length === 0 && (
        <p className="text-slate-500">No se encontraron cuentas con ese criterio.</p>
      )}

      <ul className="space-y-2">
        {filtered.map((account) => {
          const balance = accountBalanceFromTransactions(account.id, transactions);
          const count = transactionCountByAccount(account.id, transactions);

          return (
            <li key={account.id}>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `${account.color ?? "#64748b"}20`,
                      color: account.color ?? "#64748b",
                    }}
                  >
                    <AccountIcon icon={account.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{account.name}</p>
                    {account.description && (
                      <p className="truncate text-xs text-slate-500">
                        {account.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      {count} {count === 1 ? "movimiento" : "movimientos"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold tabular-nums ${
                        balance >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatMoney(balance, account.currency_code)}
                    </p>
                    <Button asChild variant="ghost" size="sm" className="mt-1 h-8 px-2">
                      <Link href={`/cuentas/${account.id}/editar`}>
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
    </div>
  );
}
