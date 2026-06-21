"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CategoryCreateDialog } from "@/components/transactions/category-create-dialog";
import { CategoryEditDialog } from "@/components/transactions/category-edit-dialog";
import { SubcategoryCreateDialog } from "@/components/transactions/subcategory-create-dialog";
import { SubcategoryEditDialog } from "@/components/transactions/subcategory-edit-dialog";
import { choicePill, emptyPanel, inlineAction } from "@/lib/a11y";
import { cn } from "@/lib/utils";
import type { Category, CategoryType } from "@/types/database";

interface CategoryFieldGroupProps {
  categoryType: CategoryType;
  categories: Category[];
  getSubcategoriesFor: (parentId: string) => Category[];
  parentCategoryId: string;
  subcategoryId: string;
  onParentChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategoryId: string) => void;
  categoryKindLabel?: string;
  onCreateCategory?: (data: {
    name: string;
    type: CategoryType;
    icon?: string;
    color?: string;
  }) => Promise<Category>;
  onEditCategory?: (
    categoryId: string,
    data: { name: string; icon?: string; color?: string }
  ) => Promise<Category>;
  onDeleteCategory?: (
    categoryId: string
  ) => Promise<
    { ok: true } | { ok: false; reason: "has_transactions" | "has_subcategories" }
  >;
  onCreateSubcategory?: (
    parentId: string,
    data: { name: string; icon?: string; color?: string }
  ) => Promise<Category>;
  onEditSubcategory?: (
    subcategoryId: string,
    data: { name: string; icon?: string; color?: string }
  ) => Promise<Category>;
  onDeleteSubcategory?: (
    subcategoryId: string
  ) => Promise<{ ok: true } | { ok: false; reason: "has_transactions" }>;
}

function FieldActions({
  onCreate,
  onEdit,
  onDelete,
  createLabel,
  editDisabled,
  deleteDisabled,
}: {
  onCreate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  createLabel: string;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
}) {
  if (!onCreate && !onEdit && !onDelete) return null;

  return (
    <div className="flex items-center gap-1">
      {onCreate && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(inlineAction, "h-8 gap-1 px-2")}
          onClick={onCreate}
        >
          <Plus className="h-4 w-4" />
          {createLabel}
        </Button>
      )}
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={onEdit}
          disabled={editDisabled}
          aria-label="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={deleteDisabled}
          aria-label="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function CategoryFieldGroup({
  categoryType,
  categories,
  getSubcategoriesFor,
  parentCategoryId,
  subcategoryId,
  onParentChange,
  onSubcategoryChange,
  categoryKindLabel = "movimiento",
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  onCreateSubcategory,
  onEditSubcategory,
  onDeleteSubcategory,
}: CategoryFieldGroupProps) {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryEditOpen, setCategoryEditOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [subcategoryEditOpen, setSubcategoryEditOpen] = useState(false);

  const subcategories = useMemo(
    () => (parentCategoryId ? getSubcategoriesFor(parentCategoryId) : []),
    [getSubcategoriesFor, parentCategoryId]
  );

  const selectedParent = useMemo(
    () => categories.find((c) => c.id === parentCategoryId),
    [categories, parentCategoryId]
  );

  const selectedSubcategory = useMemo(
    () => subcategories.find((s) => s.id === subcategoryId),
    [subcategories, subcategoryId]
  );

  const handleParentChange = (categoryId: string) => {
    onParentChange(categoryId);
    onSubcategoryChange("");
  };

  const handleCategoryDeleted = () => {
    onParentChange("");
    onSubcategoryChange("");
  };

  const handleSubcategoryDeleted = () => {
    onSubcategoryChange("");
  };

  const quickDeleteCategory = async () => {
    if (!onDeleteCategory || !selectedParent) return;
    const result = await onDeleteCategory(selectedParent.id);
    if (result.ok) {
      handleCategoryDeleted();
      return;
    }
    if (result.reason === "has_subcategories") {
      window.alert(
        "No se puede eliminar: tiene subcategorías. Eliminá o reasigná las subcategorías primero."
      );
    } else {
      window.alert(
        "No se puede eliminar: hay transacciones vinculadas a esta categoría."
      );
    }
  };

  const quickDeleteSubcategory = async () => {
    if (!onDeleteSubcategory || !selectedSubcategory) return;
    const result = await onDeleteSubcategory(selectedSubcategory.id);
    if (result.ok) {
      handleSubcategoryDeleted();
      return;
    }
    window.alert(
      "No se puede eliminar: hay transacciones vinculadas a esta subcategoría."
    );
  };

  const categoryLabel =
    categoryType === "investment" ? "Categoría de inversión" : "Categoría";
  const subcategoryLabel =
    categoryType === "investment"
      ? "Subcategoría de inversión"
      : "Subcategoría";

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>{categoryLabel}</Label>
          <FieldActions
            createLabel="Nueva"
            onCreate={
              onCreateCategory ? () => setCategoryDialogOpen(true) : undefined
            }
            onEdit={
              onEditCategory && selectedParent
                ? () => setCategoryEditOpen(true)
                : undefined
            }
            onDelete={
              onDeleteCategory && selectedParent
                ? () => void quickDeleteCategory()
                : undefined
            }
            editDisabled={!selectedParent}
            deleteDisabled={!selectedParent}
          />
        </div>
        {categories.length === 0 ? (
          <p className={emptyPanel}>
            Todavía no tenés categorías de {categoryKindLabel}.
            {onCreateCategory
              ? ' Tocá "Nueva" para crear una.'
              : " Creá una desde un formulario de transacción."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleParentChange(c.id)}
                className={choicePill(parentCategoryId === c.id)}
                style={
                  parentCategoryId === c.id
                    ? undefined
                    : { borderLeft: `3px solid ${c.color ?? "#64748b"}` }
                }
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>{subcategoryLabel}</Label>
          <FieldActions
            createLabel="Nueva"
            onCreate={
              onCreateSubcategory && selectedParent
                ? () => setSubcategoryDialogOpen(true)
                : undefined
            }
            onEdit={
              onEditSubcategory && selectedSubcategory
                ? () => setSubcategoryEditOpen(true)
                : undefined
            }
            onDelete={
              onDeleteSubcategory && selectedSubcategory
                ? () => void quickDeleteSubcategory()
                : undefined
            }
            editDisabled={!selectedSubcategory}
            deleteDisabled={!selectedSubcategory}
          />
        </div>
        {!parentCategoryId ? (
          <p className={emptyPanel}>Seleccioná una categoría primero.</p>
        ) : subcategories.length === 0 ? (
          <p className={emptyPanel}>
            {selectedParent?.name} no tiene subcategorías.
            {onCreateSubcategory
              ? ' Tocá "Nueva" para crear una.'
              : " Creá una desde un formulario de transacción."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subcategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSubcategoryChange(sub.id)}
                className={choicePill(subcategoryId === sub.id)}
                style={
                  subcategoryId === sub.id
                    ? undefined
                    : {
                        borderLeft: `3px solid ${sub.color ?? selectedParent?.color ?? "#64748b"}`,
                      }
                }
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {onCreateCategory && (
        <CategoryCreateDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          type={categoryType}
          onCreate={onCreateCategory}
          onCreated={(category) => handleParentChange(category.id)}
        />
      )}

      {onEditCategory && selectedParent && (
        <CategoryEditDialog
          open={categoryEditOpen}
          onOpenChange={setCategoryEditOpen}
          category={selectedParent}
          onUpdate={(data) => onEditCategory(selectedParent.id, data)}
          onDelete={
            onDeleteCategory
              ? () => onDeleteCategory(selectedParent.id)
              : undefined
          }
          onUpdated={(category) => handleParentChange(category.id)}
          onDeleted={handleCategoryDeleted}
        />
      )}

      {onCreateSubcategory && selectedParent && (
        <SubcategoryCreateDialog
          open={subcategoryDialogOpen}
          onOpenChange={setSubcategoryDialogOpen}
          parentCategory={selectedParent}
          onCreate={(data) => onCreateSubcategory(selectedParent.id, data)}
          onCreated={(subcategory) => onSubcategoryChange(subcategory.id)}
        />
      )}

      {onEditSubcategory && selectedParent && selectedSubcategory && (
        <SubcategoryEditDialog
          open={subcategoryEditOpen}
          onOpenChange={setSubcategoryEditOpen}
          parentCategory={selectedParent}
          subcategory={selectedSubcategory}
          onUpdate={(data) => onEditSubcategory(selectedSubcategory.id, data)}
          onDelete={
            onDeleteSubcategory
              ? () => onDeleteSubcategory(selectedSubcategory.id)
              : undefined
          }
          onUpdated={(subcategory) => onSubcategoryChange(subcategory.id)}
          onDeleted={handleSubcategoryDeleted}
        />
      )}
    </>
  );
}
