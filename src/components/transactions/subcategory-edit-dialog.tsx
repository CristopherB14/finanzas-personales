"use client";

import { useState } from "react";
import { SubcategoryForm } from "@/components/categories/subcategory-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Category } from "@/types/database";

interface SubcategoryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentCategory: Category;
  subcategory: Category;
  onUpdate: (data: {
    name: string;
    icon?: string;
    color?: string;
  }) => Promise<Category>;
  onDelete?: () => Promise<
    { ok: true } | { ok: false; reason: "has_transactions" }
  >;
  onUpdated: (subcategory: Category) => void;
  onDeleted?: () => void;
}

export function SubcategoryEditDialog({
  open,
  onOpenChange,
  parentCategory,
  subcategory,
  onUpdate,
  onDelete,
  onUpdated,
  onDeleted,
}: SubcategoryEditDialogProps) {
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
          <DialogTitle>Editar subcategoría</DialogTitle>
        </DialogHeader>
        {open && (
          <SubcategoryForm
            key={subcategory.id}
            mode="edit"
            variant="embedded"
            parentCategory={parentCategory}
            initial={subcategory}
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
                    setDeleteError(
                      "No se puede eliminar: hay transacciones vinculadas a esta subcategoría."
                    );
                  }
                : undefined
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
