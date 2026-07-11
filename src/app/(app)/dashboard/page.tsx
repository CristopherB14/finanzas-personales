"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { StatusBanner } from "@/components/dashboard/status-banner";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { AccountIcon } from "@/components/accounts/account-icon";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { formatMoney, formatMoneyByCurrency } from "@/lib/format";
import {
  buildDashboardMetrics,
  last6MonthsChart,
} from "@/lib/finance/calculations";
import {
  accountBalanceFromTransactions,
  transactionCountByAccount,
} from "@/lib/data/accounts";

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { transactions, loading: txLoading } = useTransactions(user?.id);
  const { accounts } = useAccounts(user?.id);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (userLoading || txLoading) {
    return <LoadingState label="Cargando tu resumen…" />;
  }

  const metrics = buildDashboardMetrics(transactions, year, month, accounts);

  const chartData = last6MonthsChart(
    transactions,
    now,
    accounts,
    metrics.primaryCurrency
  );
  const emergencyPercent = Math.min(100, (metrics.emergencyMonths / 6) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Tu situación financiera"
        actions={
          <Button asChild className="hidden md:inline-flex">
            <Link href="/transacciones/nuevo">
              <Plus className="h-4 w-4" aria-hidden />
              Nueva transacción
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          label="Efectivo disponible"
          value={formatMoneyByCurrency(metrics.cashByCurrency)}
          variant="hero"
        />
        <MetricCard
          label="Patrimonio neto"
          value={formatMoneyByCurrency(metrics.netWorthByCurrency)}
          subtext={`Inversiones: ${formatMoneyByCurrency(metrics.investedAssetsByCurrency)}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard
          label="Ingresos del mes"
          value={formatMoneyByCurrency(metrics.incomeByCurrency)}
        />
        <MetricCard
          label="Gastos del mes"
          value={formatMoneyByCurrency(metrics.expenseByCurrency)}
        />
        <MetricCard
          label="Inversiones del mes"
          value={formatMoneyByCurrency(metrics.investmentByCurrency)}
        />
        <MetricCard
          label="Ahorro del mes"
          value={formatMoneyByCurrency(metrics.savingsByCurrency)}
          subtext={`Tasa de ahorro (${metrics.primaryCurrency}): ${metrics.savingsRate.toFixed(0)}%`}
          traffic={metrics.status}
        />
      </div>

      <StatusBanner status={metrics.status} message={metrics.statusMessage} />

      {accounts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Saldo por cuenta</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/cuentas">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {accounts.slice(0, 5).map((account) => {
              const balance = accountBalanceFromTransactions(
                account.id,
                transactions,
                account.type
              );
              const count = transactionCountByAccount(account.id, transactions);
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${account.color ?? "#64748b"}20`,
                        color: account.color ?? "#64748b",
                      }}
                    >
                      <AccountIcon icon={account.icon} className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {count} {count === 1 ? "movimiento" : "movimientos"}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`amount text-sm ${
                      balance >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatMoney(balance, account.currency_code)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fondo de emergencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-semibold tabular-nums">
            {metrics.emergencyMonths.toFixed(1)} meses
          </p>
          <p className="text-sm text-muted-foreground">
            Basado en tu efectivo disponible y ritmo de gastos. Objetivo: 6 meses.
          </p>
          <Progress value={emergencyPercent} className="h-3" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyChart data={chartData} currency={metrics.primaryCurrency} />
        </CardContent>
      </Card>

      {transactions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Empezá registrando tu primer gasto, ingreso o inversión.
            </p>
            <Button asChild className="mt-4">
              <Link href="/transacciones/nuevo">Nueva transacción</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
