"use client";

import { useRef, useState } from "react";
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
  onSave: (data: {
    name: string;
    icon?: string;
    color?: string;
  }) => Promise<Category>;
  onDelete?: () => Promise<{ ok: boolean; reason?: string }>;
  onSaved?: (subcategory: Category) => void;
  onDeleted?: () => void;
}

export function SubcategoryEditDialog({
  open,
  onOpenChange,
  parentCategory,
  subcategory,
  onSave,
  onDelete,
  onSaved,
  onDeleted,
}: SubcategoryEditDialogProps) {
  const savedRef = useRef<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              savedRef.current = await onSave(data);
            }}
            onSuccess={() => {
              if (savedRef.current) {
                onSaved?.(savedRef.current);
                savedRef.current = null;
              }
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
            onDelete={
              onDelete
                ? async () => {
                    setDeleteError(null);
                    const result = await onDelete();
                    if (!result.ok && result.reason === "has_transactions") {
                      setDeleteError(
                        "No podés eliminar esta subcategoría porque tiene movimientos asociados."
                      );
                      return;
                    }
                    onDeleted?.();
                    onOpenChange(false);
                  }
                : undefined
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
