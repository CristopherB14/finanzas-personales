"use client";

import { useState } from "react";
import { CategoryForm } from "@/components/categories/category-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Category } from "@/types/database";

interface CategoryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  onUpdate: (data: {
    name: string;
    icon?: string;
    color?: string;
  }) => Promise<Category>;
  onDelete?: () => Promise<
    { ok: true } | { ok: false; reason: "has_transactions" | "has_subcategories" }
  >;
  onUpdated: (category: Category) => void;
  onDeleted?: () => void;
}

export function CategoryEditDialog({
  open,
  onOpenChange,
  category,
  onUpdate,
  onDelete,
  onUpdated,
  onDeleted,
}: CategoryEditDialogProps) {
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDeleteError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar categoría</DialogTitle>
        </DialogHeader>
        {open && (
          <CategoryForm
            key={category.id}
            mode="edit"
            variant="embedded"
            type={category.type}
            initial={category}
            deleteError={deleteError}
            onSubmit={async (data) => {
              const updated = await onUpdate(data);
              onUpdated(updated);
            }}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
            onDelete={
              onDelete
                ? async () => {
                    setDeleteError(null);
                    const result = await onDelete();
                    if (result.ok) {
                      onDeleted?.();
                      onOpenChange(false);
                      return;
                    }
                    if (result.reason === "has_subcategories") {
                      setDeleteError(
                        "No se puede eliminar: tiene subcategorías. Eliminá o reasigná las subcategorías primero."
                      );
                    } else {
                      setDeleteError(
                        "No se puede eliminar: hay transacciones vinculadas a esta categoría."
                      );
                    }
                  }
                : undefined
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
