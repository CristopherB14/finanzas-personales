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
import { cn } from "@/lib/utils";

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
    <div className="min-w-0 space-y-6">
      <header className="flex min-w-0 items-center justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-bold">Cuentas</h1>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/cuentas/nueva">
            <Plus className="h-4 w-4" />
            Nueva
          </Link>
        </Button>
      </header>

      {accounts.length > 0 && (
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cuenta…"
            className="w-full pl-10"
          />
        </div>
      )}

      {loading && <p className="text-muted-foreground">Cargando…</p>}

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
        <p className="text-muted-foreground">No se encontraron cuentas con ese criterio.</p>
      )}

      <ul className="min-w-0 space-y-2">
        {filtered.map((account) => {
          const balance = accountBalanceFromTransactions(
            account.id,
            transactions,
            account.type
          );
          const count = transactionCountByAccount(account.id, transactions);

          return (
            <li key={account.id} className="min-w-0">
              <Card className="min-w-0 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex min-w-0 items-start gap-3 sm:flex-1">
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
                        <p className="truncate font-medium">{account.name}</p>
                        {account.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {account.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {count} {count === 1 ? "movimiento" : "movimientos"}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border pt-3 sm:w-auto sm:shrink-0 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                      <p
                        className={cn(
                          "min-w-0 text-left text-sm font-semibold tabular-nums sm:text-right sm:text-base",
                          balance >= 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-red-700 dark:text-red-400"
                        )}
                      >
                        {formatMoney(balance, account.currency_code)}
                      </p>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 px-2"
                      >
                        <Link href={`/cuentas/${account.id}/editar`}>
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Editar {account.name}</span>
                        </Link>
                      </Button>
                    </div>
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
