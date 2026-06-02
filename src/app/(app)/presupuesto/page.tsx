"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import {
  budgetTrafficLight,
  budgetUsagePercent,
  filterByMonth,
} from "@/lib/finance/calculations";
import { fetchCategories, ensureUserSetup } from "@/lib/data/seed-user";
import type { Category } from "@/types/database";
import { cn } from "@/lib/utils";

const DEFAULT_LIMITS: Record<string, number> = {
  Alimentación: 15000000,
  Transporte: 8000000,
  Entretenimiento: 5000000,
  Vivienda: 25000000,
};

export default function PresupuestoPage() {
  const { user } = useUser();
  const { transactions } = useTransactions(user?.id);
  const [categories, setCategories] = useState<Category[]>([]);
  const [limits, setLimits] = useState<Record<string, number>>({});

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      await ensureUserSetup(user.id);
      const cats = await fetchCategories(user.id, "expense");
      setCategories(cats);

      const supabase = createClient();
      const { data: budget } = await supabase
        .from("budgets")
        .select("id")
        .eq("user_id", user.id)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();

      if (budget) {
        const { data: lines } = await supabase
          .from("budget_lines")
          .select("category_id, limit_cents")
          .eq("budget_id", budget.id);
        const map: Record<string, number> = {};
        lines?.forEach((l) => {
          map[l.category_id] = l.limit_cents;
        });
        setLimits(map);
      } else {
        const map: Record<string, number> = {};
        cats.forEach((c) => {
          map[c.id] = DEFAULT_LIMITS[c.name] ?? 10000000;
        });
        setLimits(map);
      }
    })();
  }, [user?.id, year, month]);

  const monthTx = useMemo(
    () => filterByMonth(transactions, year, month).filter((t) => t.type === "expense"),
    [transactions, year, month]
  );

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of monthTx) {
      if (t.category_id) {
        map[t.category_id] = (map[t.category_id] ?? 0) + t.amount_cents;
      }
    }
    return map;
  }, [monthTx]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Presupuesto</h1>
        <p className="text-sm text-slate-500">
          Compará lo que planeás gastar con lo que ya gastaste este mes.
        </p>
      </header>

      <div className="space-y-3">
        {categories.map((cat) => {
          const limit = limits[cat.id] ?? 0;
          const spent = spentByCategory[cat.id] ?? 0;
          const pct = budgetUsagePercent(spent, limit);
          const light = budgetTrafficLight(pct);

          return (
            <Card key={cat.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{cat.name}</span>
                  <span
                    className={cn(
                      "text-xs font-normal",
                      light === "green" && "text-emerald-600",
                      light === "yellow" && "text-amber-600",
                      light === "red" && "text-red-600"
                    )}
                  >
                    {pct.toFixed(0)}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress
                  value={Math.min(100, pct)}
                  indicatorClassName={
                    light === "red"
                      ? "bg-red-500"
                      : light === "yellow"
                        ? "bg-amber-500"
                        : undefined
                  }
                />
                <p className="text-sm text-slate-500">
                  {formatMoney(spent)} de {formatMoney(limit)}
                </p>
                {pct >= 80 && pct < 100 && (
                  <p className="text-xs text-amber-700">
                    Estás cerca del límite en {cat.name}.
                  </p>
                )}
                {pct >= 100 && (
                  <p className="text-xs text-red-700">
                    Superaste el presupuesto de {cat.name}.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
