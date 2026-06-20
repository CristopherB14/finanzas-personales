"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useInvestments } from "@/hooks/use-investments";
import { formatCategoryLabel } from "@/lib/categories/helpers";
import { formatMoney } from "@/lib/format";
import type { LocalTransaction } from "@/types/database";

export default function InversionesPage() {
  const { user } = useUser();
  const { transactions, loading: txLoading } = useTransactions(user?.id);
  const { portfolio, investments, categories, loading: invLoading } = useInvestments(
    user?.id,
    transactions
  );

  const categoryLabel = useMemo(
    () => (categoryId: string | null) =>
      formatCategoryLabel(categories, categoryId),
    [categories]
  );

  const loading = txLoading || invLoading;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inversiones</h1>
          <p className="text-sm text-muted-foreground">
            Tu portafolio y movimientos de inversión.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/inversiones/nuevo">
            <Plus className="h-4 w-4" />
            Nueva
          </Link>
        </Button>
      </header>

      {loading && <p className="text-muted-foreground">Cargando…</p>}

      {!loading && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total invertido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums text-cyan-700">
                {formatMoney(portfolio.totalMarketValueCents)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Valor de mercado = monto invertido (precios en vivo próximamente)
              </p>
            </CardContent>
          </Card>

          {portfolio.holdings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Asignación por activo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {portfolio.holdings.map((holding) => (
                  <div key={holding.subcategoryId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {holding.categoryName} · {holding.subcategoryName}
                      </span>
                      <span className="text-muted-foreground">
                        {holding.allocationPercent.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={holding.allocationPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(holding.marketValueCents)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Historial</h2>
            {investments.length === 0 ? (
              <p className="text-muted-foreground">No hay inversiones registradas.</p>
            ) : (
              <ul className="space-y-2">
                {investments.map((t) => {
                  const tx = t as LocalTransaction;
                  return (
                  <li key={t.client_id}>
                    <Card>
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {t.description || "Inversión"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.transaction_date), "d MMM yyyy", {
                              locale: es,
                            })}
                            {categoryLabel(t.category_id) &&
                              ` · ${categoryLabel(t.category_id)}`}
                            {tx._syncStatus === "pending" && " · Pendiente sync"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-cyan-700 tabular-nums">
                            −{formatMoney(t.amount_cents, t.currency_code)}
                          </p>
                          <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                            <Link href={`/inversiones/${t.client_id}/editar`}>
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
