"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CategoryForm } from "@/components/categories/category-form";
import { useUser } from "@/hooks/use-user";
import { useCategories } from "@/hooks/use-categories";
import type { CategoryType } from "@/types/database";

function NuevaCategoriaForm() {
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") === "income"
    ? "income"
    : searchParams.get("type") === "investment"
      ? "investment"
      : "expense") as CategoryType;
  const { user } = useUser();
  const { addCategory } = useCategories(user?.id);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  return (
    <CategoryForm
      mode="create"
      type={type}
      onSubmit={async (data) => {
        await addCategory({ ...data, type });
      }}
    />
  );
}

export default function NuevaCategoriaPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
      <NuevaCategoriaForm />
    </Suspense>
  );
}
