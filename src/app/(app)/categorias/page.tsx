"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryIcon } from "@/components/categories/category-icon";
import { SubcategoryCreateDialog } from "@/components/transactions/subcategory-create-dialog";
import { SubcategoryEditDialog } from "@/components/categories/subcategory-edit-dialog";
import { useUser } from "@/hooks/use-user";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { transactionCountByCategory } from "@/lib/data/categories";
import { choicePill } from "@/lib/a11y";
import type { Category } from "@/types/database";

export default function CategoriasPage() {
  const { user } = useUser();
  const { transactions } = useTransactions(user?.id);
  const {
    expenseCategories,
    incomeCategories,
    investmentCategories,
    getSubcategoriesFor,
    loading,
    addSubcategory,
    editSubcategory: saveSubcategory,
    removeSubcategory,
  } = useCategories(user?.id, transactions);
  const [tab, setTab] = useState<"expense" | "income" | "investment">("expense");
  const [createParent, setCreateParent] = useState<Category | null>(null);
  const [editSubcategory, setEditSubcategory] = useState<{
    parent: Category;
    subcategory: Category;
  } | null>(null);

  const categories =
    tab === "expense"
      ? expenseCategories
      : tab === "income"
        ? incomeCategories
        : investmentCategories;

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
        {(["expense", "income", "investment"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTab(type)}
            className={choicePill(tab === type)}
          >
            {type === "expense"
              ? "Gastos"
              : type === "income"
                ? "Ingresos"
                : "Inversiones"}
          </button>
        ))}
      </div>

      {loading && <p className="text-muted-foreground">Cargando…</p>}

      {!loading && categories.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-slate-600">
              No hay categorías de{" "}
              {tab === "expense"
                ? "gastos"
                : tab === "income"
                  ? "ingresos"
                  : "inversiones"}{" "}
              todavía.
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
          const subcategories = getSubcategoriesFor(category.id);

          return (
            <li key={category.id} className="space-y-2">
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
                    <p className="text-xs text-muted-foreground">
                      {count}{" "}
                      {count === 1 ? "movimiento" : "movimientos"}
                      {subcategories.length > 0 &&
                        ` · ${subcategories.length} subcategoría${subcategories.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setCreateParent(category)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                      <Link href={`/categorias/${category.id}/editar`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {subcategories.length > 0 && (
                <ul className="ml-4 space-y-2 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                  {subcategories.map((sub) => {
                    const subCount = transactionCountByCategory(
                      sub.id,
                      transactions
                    );

                    return (
                      <li key={sub.id}>
                        <Card className="border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/50">
                          <CardContent className="flex items-center gap-4 p-3">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor: `${sub.color ?? category.color ?? "#64748b"}20`,
                                color: sub.color ?? category.color ?? "#64748b",
                              }}
                            >
                              <CategoryIcon
                                icon={sub.icon}
                                className="h-4 w-4"
                              />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{sub.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {subCount}{" "}
                                {subCount === 1 ? "movimiento" : "movimientos"}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() =>
                                setEditSubcategory({
                                  parent: category,
                                  subcategory: sub,
                                })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </CardContent>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {createParent && (
        <SubcategoryCreateDialog
          open={Boolean(createParent)}
          onOpenChange={(open) => {
            if (!open) setCreateParent(null);
          }}
          parentCategory={createParent}
          onCreate={(data) => addSubcategory(createParent.id, data)}
          onCreated={() => setCreateParent(null)}
        />
      )}

      {editSubcategory && (
        <SubcategoryEditDialog
          open={Boolean(editSubcategory)}
          onOpenChange={(open) => {
            if (!open) setEditSubcategory(null);
          }}
          parentCategory={editSubcategory.parent}
          subcategory={editSubcategory.subcategory}
          onSave={async (data) =>
            saveSubcategory(editSubcategory.subcategory.id, data)
          }
          onDelete={async () => {
            const result = await removeSubcategory(
              editSubcategory.subcategory.id
            );
            return {
              ok: result.ok,
              reason: result.ok ? undefined : result.reason,
            };
          }}
          onDeleted={() => setEditSubcategory(null)}
        />
      )}
    </div>
  );
}
