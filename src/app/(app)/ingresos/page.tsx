"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { formatMoney } from "@/lib/format";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function IngresosPage() {
  const { user } = useUser();
  const { transactions, loading } = useTransactions(user?.id);

  const ingresos = transactions.filter((t) => t.type === "income");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ingresos</h1>
        <Button asChild size="sm">
          <Link href="/ingresos/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo
          </Link>
        </Button>
      </header>

      {loading && <p className="text-slate-500">Cargando…</p>}

      <ul className="space-y-2">
        {ingresos.map((t) => (
          <li key={t.client_id}>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{t.description || "Ingreso"}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(t.transaction_date), "d MMM yyyy", {
                      locale: es,
                    })}
                  </p>
                </div>
                <p className="font-semibold text-emerald-600 tabular-nums">
                  +{formatMoney(t.amount_cents, t.currency_code)}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
