"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryIcon } from "@/components/categories/category-icon";
import { useUser } from "@/hooks/use-user";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { transactionCountByCategory } from "@/lib/data/categories";
import { cn } from "@/lib/utils";

export default function CategoriasPage() {
  const { user } = useUser();
  const { transactions } = useTransactions(user?.id);
  const { expenseCategories, incomeCategories, loading } = useCategories(
    user?.id,
    transactions
  );
  const [tab, setTab] = useState<"expense" | "income">("expense");

  const categories = tab === "expense" ? expenseCategories : incomeCategories;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorías</h1>
        <Button asChild size="sm">
          <Link href={`/categorias/nueva?type=${tab}`}>
            <Plus className="h-4 w-4" />
            Nueva
          </Link>
        </Button>
      </header>

      <div className="flex gap-2">
        {(["expense", "income"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTab(type)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === type
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800"
            )}
          >
            {type === "expense" ? "Gastos" : "Ingresos"}
          </button>
        ))}
      </div>

      {loading && <p className="text-slate-500">Cargando…</p>}

      {!loading && categories.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-slate-600">
              No hay categorías de{" "}
              {tab === "expense" ? "gastos" : "ingresos"} todavía.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/categorias/nueva?type=${tab}`}>
                Crear categoría
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <ul className="space-y-2">
        {categories.map((category) => {
          const count = transactionCountByCategory(category.id, transactions);

          return (
            <li key={category.id}>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `${category.color ?? "#64748b"}20`,
                      color: category.color ?? "#64748b",
                    }}
                  >
                    <CategoryIcon icon={category.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-slate-500">
                      {count}{" "}
                      {count === 1 ? "movimiento" : "movimientos"}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                    <Link href={`/categorias/${category.id}/editar`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
