"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus, Pencil, ArrowLeftRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { formatMoney } from "@/lib/format";

export default function TransferenciasPage() {
  const { user } = useUser();
  const { transactions, loading } = useTransactions(user?.id);
  const { accounts } = useAccounts(user?.id);

  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts]
  );

  const transferencias = transactions.filter((t) => t.type === "transfer");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transferencias</h1>
          <p className="text-sm text-muted-foreground">
            Movimientos entre cuentas. No afectan ingresos, gastos ni patrimonio
            neto.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/transferencias/nuevo">
            <Plus className="h-4 w-4" />
            Nueva
          </Link>
        </Button>
      </header>

      {loading && <p className="text-muted-foreground">Cargando…</p>}

      {!loading && transferencias.length === 0 && (
        <p className="text-muted-foreground">No hay transferencias registradas.</p>
      )}

      <ul className="space-y-2">
        {transferencias.map((t) => {
          const fromAccount = accountMap.get(t.account_id);
          const toAccount = t.to_account_id
            ? accountMap.get(t.to_account_id)
            : undefined;

          return (
            <li key={t.client_id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400">
                      <ArrowLeftRight className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">
                        {t.description || "Transferencia"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.transaction_date), "d MMM yyyy", {
                          locale: es,
                        })}
                        {fromAccount && toAccount &&
                          ` · ${fromAccount} → ${toAccount}`}
                        {t._syncStatus === "pending" && " · Pendiente sync"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sky-700 tabular-nums dark:text-sky-400">
                      {formatMoney(t.amount_cents, t.currency_code)}
                    </p>
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                      <Link href={`/transferencias/${t.client_id}/editar`}>
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
