"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { StatusBanner } from "@/components/dashboard/status-banner";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { formatMoney } from "@/lib/format";
import {
  buildDashboardMetrics,
  last6MonthsChart,
} from "@/lib/finance/calculations";
import { ensureUserSetup } from "@/lib/data/seed-user";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { transactions, loading: txLoading } = useTransactions(user?.id);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  useEffect(() => {
    if (user?.id) void ensureUserSetup(user.id);
  }, [user?.id]);

  if (userLoading || txLoading) {
    return <p className="text-slate-500">Cargando tu resumen…</p>;
  }

  const metrics = buildDashboardMetrics(
    transactions,
    year,
    month,
    transactions.reduce((sum, t) => {
      if (t.type === "income") return sum + t.amount_cents;
      if (t.type === "expense") return sum - t.amount_cents;
      return sum;
    }, 0)
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
