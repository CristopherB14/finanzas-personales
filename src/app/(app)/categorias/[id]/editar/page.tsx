"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategoryForm } from "@/components/categories/category-form";
import { SubcategoryCreateDialog } from "@/components/transactions/subcategory-create-dialog";
import { SubcategoryEditDialog } from "@/components/categories/subcategory-edit-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryIcon } from "@/components/categories/category-icon";
import { useUser } from "@/hooks/use-user";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { transactionCountByCategory } from "@/lib/data/categories";
import { isSubcategory } from "@/lib/categories/helpers";
import type { Category } from "@/types/database";

export default function EditarCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: categoryId } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const { transactions } = useTransactions(user?.id);
  const {
    categories,
    loading,
    editCategory,
    removeCategory,
    getSubcategoriesFor,
    addSubcategory,
    editSubcategory,
    removeSubcategory,
  } = useCategories(user?.id, transactions);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [createSubcategoryOpen, setCreateSubcategoryOpen] = useState(false);
  const [editSubcategoryState, setEditSubcategoryState] = useState<Category | null>(
    null
  );

  const category = useMemo(() => {
    if (loading) return null;
    return categories.find((c) => c.id === categoryId) ?? null;
  }, [categoryId, categories, loading]);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  if (loading) {
    return <p className="text-slate-500">Cargando…</p>;
  }

  if (!category) {
    return (
      <div className="space-y-4">
        <p className="text-slate-500">No se encontró la categoría.</p>
        <Link href="/categorias" className="text-emerald-700 hover:underline">
          Volver a categorías
        </Link>
      </div>
    );
  }

  if (isSubcategory(category)) {
    const parent = categories.find((c) => c.id === category.parent_id);
    return (
      <div className="space-y-4">
        <p className="text-slate-500">
          Esta es una subcategoría
          {parent ? ` de ${parent.name}` : ""}.
        </p>
        <Link href="/categorias" className="text-emerald-700 hover:underline">
          Volver a categorías
        </Link>
      </div>
    );
  }

  const subcategories = getSubcategoriesFor(category.id);

  return (
    <>
      <CategoryForm
        key={category.id}
        mode="edit"
        type={category.type}
        initial={category}
        deleteError={deleteError}
        onSubmit={async (data) => {
          await editCategory(category.id, data);
        }}
        onDelete={async () => {
          setDeleteError(null);
          const result = await removeCategory(category.id);
          if (!result.ok && result.reason === "has_transactions") {
            setDeleteError(
              "No podés eliminar esta categoría porque tiene movimientos asociados."
            );
            return;
          }
          if (!result.ok && result.reason === "has_subcategories") {
            setDeleteError(
              "No podés eliminar esta categoría porque tiene subcategorías. Eliminá las subcategorías primero."
            );
            return;
          }
          router.push("/categorias");
          router.refresh();
        }}
      />

      <div className="mx-auto mt-8 max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Subcategorías</h2>
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateSubcategoryOpen(true)}
          >
            Nueva subcategoría
          </Button>
        </div>

        {subcategories.length === 0 ? (
          <p className="text-sm text-slate-500">
            Todavía no hay subcategorías en {category.name}.
          </p>
        ) : (
          <ul className="space-y-2">
            {subcategories.map((sub) => {
              const count = transactionCountByCategory(sub.id, transactions);
              return (
                <li key={sub.id}>
                  <Card>
                    <CardContent className="flex items-center gap-4 p-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${sub.color ?? category.color ?? "#64748b"}20`,
                          color: sub.color ?? category.color ?? "#64748b",
                        }}
                      >
                        <CategoryIcon icon={sub.icon} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{sub.name}</p>
                        <p className="text-xs text-slate-500">
                          {count}{" "}
                          {count === 1 ? "movimiento" : "movimientos"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditSubcategoryState(sub)}
                      >
                        Editar
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SubcategoryCreateDialog
        open={createSubcategoryOpen}
        onOpenChange={setCreateSubcategoryOpen}
        parentCategory={category}
        onCreate={(data) => addSubcategory(category.id, data)}
        onCreated={() => setCreateSubcategoryOpen(false)}
      />

      {editSubcategoryState && (
        <SubcategoryEditDialog
          open={Boolean(editSubcategoryState)}
          onOpenChange={(open) => {
            if (!open) setEditSubcategoryState(null);
          }}
          parentCategory={category}
          subcategory={editSubcategoryState}
          onSave={async (data) =>
            editSubcategory(editSubcategoryState.id, data)
          }
          onDelete={async () => {
            const result = await removeSubcategory(editSubcategoryState.id);
            return {
              ok: result.ok,
              reason: result.ok ? undefined : result.reason,
            };
          }}
          onDeleted={() => setEditSubcategoryState(null)}
        />
      )}
    </>
  );
}
