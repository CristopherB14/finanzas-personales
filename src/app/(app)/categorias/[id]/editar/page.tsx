"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategoryForm } from "@/components/categories/category-form";
import { useUser } from "@/hooks/use-user";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";

export default function EditarCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: categoryId } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const { transactions } = useTransactions(user?.id);
  const { categories, loading, editCategory, removeCategory } = useCategories(
    user?.id,
    transactions
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  return (
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
        router.push("/categorias");
        router.refresh();
      }}
    />
  );
}
