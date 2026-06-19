"use client";

import { useRef } from "react";
import { CategoryForm } from "@/components/categories/category-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Category, CategoryType } from "@/types/database";

type CategoryCreateInput = {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
};

interface CategoryCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: CategoryType;
  onCreate: (data: CategoryCreateInput) => Promise<Category>;
  onCreated: (category: Category) => void;
}

export function CategoryCreateDialog({
  open,
  onOpenChange,
  type,
  onCreate,
  onCreated,
}: CategoryCreateDialogProps) {
  const createdRef = useRef<Category | null>(null);

  const title =
    type === "expense" ? "Nueva categoría de gasto" : "Nueva categoría de ingreso";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open && (
          <CategoryForm
            mode="create"
            variant="embedded"
            type={type}
            onSubmit={async (data) => {
              createdRef.current = await onCreate({ ...data, type });
            }}
            onSuccess={() => {
              if (createdRef.current) {
                onCreated(createdRef.current);
                createdRef.current = null;
              }
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
