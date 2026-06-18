"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { StatusBanner } from "@/components/dashboard/status-banner";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { AccountIcon } from "@/components/accounts/account-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { formatMoney } from "@/lib/format";
import {
  buildDashboardMetrics,
  last6MonthsChart,
} from "@/lib/finance/calculations";
import {
  accountBalanceFromTransactions,
  totalBalanceFromTransactions,
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
    return <p className="text-slate-500">Cargando tu resumen…</p>;
  }

  const totalBalance = totalBalanceFromTransactions(transactions);

  const metrics = buildDashboardMetrics(
    transactions,
    year,
    month,
    totalBalance
  );

  const chartData = last6MonthsChart(transactions);
  const emergencyPercent = Math.min(100, (metrics.emergencyMonths / 6) * 100);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Tu situación financiera</p>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <Button asChild className="hidden md:inline-flex">
          <Link href="/gastos/nuevo">
            <Plus className="h-4 w-4" />
            Registrar gasto
          </Link>
        </Button>
      </header>

      <MetricCard
        label="Patrimonio estimado (cuentas)"
        value={formatMoney(metrics.netWorthCents)}
        variant="hero"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Ingresos del mes"
          value={formatMoney(metrics.incomeCents)}
        />
        <MetricCard
          label="Gastos del mes"
          value={formatMoney(metrics.expenseCents)}
        />
        <MetricCard
          label="Ahorro del mes"
          value={formatMoney(metrics.savingsCents)}
          subtext={`Tasa de ahorro: ${metrics.savingsRate.toFixed(0)}%`}
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
                transactions
              );
              const count = transactionCountByAccount(account.id, transactions);
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900"
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
                      <p className="text-xs text-slate-500">
                        {count} {count === 1 ? "movimiento" : "movimientos"}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      balance >= 0 ? "text-emerald-600" : "text-red-600"
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
          <p className="text-sm text-slate-500">
            Con tu ritmo actual de gastos, podrías cubrirte ese tiempo.
            Objetivo recomendado: 6 meses.
          </p>
          <Progress value={emergencyPercent} className="h-3" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyChart data={chartData} />
        </CardContent>
      </Card>

      {transactions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-slate-600">
              Empezá registrando tu primer gasto o ingreso.
            </p>
            <Button asChild className="mt-4">
              <Link href="/gastos/nuevo">Registrar gasto</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
