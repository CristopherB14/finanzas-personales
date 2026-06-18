"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryIcon } from "@/components/categories/category-icon";
import { CATEGORY_ICON_OPTIONS } from "@/constants/category-icons";
import type { Category, CategoryType } from "@/types/database";
import { cn } from "@/lib/utils";

interface CategoryFormProps {
  mode: "create" | "edit";
  type: CategoryType;
  initial?: Category;
  onSubmit: (data: {
    name: string;
    icon?: string;
    color?: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  deleteError?: string | null;
}

export function CategoryForm({
  mode,
  type,
  initial,
  onSubmit,
  onDelete,
  deleteError,
}: CategoryFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(
    initial?.icon ?? CATEGORY_ICON_OPTIONS[0].icon
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedOption =
    CATEGORY_ICON_OPTIONS.find((o) => o.icon === icon) ??
    CATEGORY_ICON_OPTIONS[0];

  const title =
    mode === "create"
      ? type === "expense"
        ? "Nueva categoría de gasto"
        : "Nueva categoría de ingreso"
      : "Editar categoría";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        icon: selectedOption.icon,
        color: selectedOption.color,
      });
      router.push("/categorias");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-5">
      <h1 className="text-2xl font-bold">{title}</h1>

      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            type === "expense" ? "Ej: Supermercado" : "Ej: Honorarios"
          }
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>Ícono</Label>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {CATEGORY_ICON_OPTIONS.map((option) => (
            <button
              key={option.icon}
              type="button"
              onClick={() => setIcon(option.icon)}
              title={option.label}
              className={cn(
                "flex h-11 items-center justify-center rounded-xl border transition-colors",
                icon === option.icon
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
              )}
              style={
                icon === option.icon
                  ? undefined
                  : { color: option.color }
              }
            >
              <CategoryIcon icon={option.icon} className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={saving}>
        {saving
          ? "Guardando…"
          : mode === "create"
            ? "Crear categoría"
            : "Guardar cambios"}
      </Button>

      {mode === "edit" && onDelete && (
        <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          {deleteError && (
            <p className="text-sm text-red-600">{deleteError}</p>
          )}
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? "Eliminando…" : "Eliminar categoría"}
          </Button>
        </div>
      )}
    </form>
  );
}
