"use client";

import { useRef } from "react";
import { SubcategoryForm } from "@/components/categories/subcategory-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Category } from "@/types/database";

interface SubcategoryCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentCategory: Category;
  onCreate: (data: {
    name: string;
    icon?: string;
    color?: string;
  }) => Promise<Category>;
  onCreated: (subcategory: Category) => void;
}

export function SubcategoryCreateDialog({
  open,
  onOpenChange,
  parentCategory,
  onCreate,
  onCreated,
}: SubcategoryCreateDialogProps) {
  const createdRef = useRef<Category | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nueva subcategoría en {parentCategory.name}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <SubcategoryForm
            mode="create"
            variant="embedded"
            parentCategory={parentCategory}
            onSubmit={async (data) => {
              createdRef.current = await onCreate(data);
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
