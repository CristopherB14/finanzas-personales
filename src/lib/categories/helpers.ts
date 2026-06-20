import type { Category, CategoryType } from "@/types/database";

export function isTopLevelCategory(category: Category): boolean {
  return category.parent_id === null;
}

export function isSubcategory(category: Category): boolean {
  return category.parent_id !== null;
}

export function getTopLevelCategories(
  categories: Category[],
  type?: CategoryType
): Category[] {
  return categories
    .filter((c) => c.parent_id === null && (!type || c.type === type))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getSubcategories(
  categories: Category[],
  parentId: string
): Category[] {
  return categories
    .filter((c) => c.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function findCategory(
  categories: Category[],
  categoryId: string
): Category | undefined {
  return categories.find((c) => c.id === categoryId);
}

export function resolveTransactionCategorySelection(
  categories: Category[],
  categoryId: string | null | undefined
): { parentId: string; subcategoryId: string } {
  if (!categoryId) return { parentId: "", subcategoryId: "" };

  const category = findCategory(categories, categoryId);
  if (!category) return { parentId: "", subcategoryId: "" };

  if (category.parent_id) {
    return { parentId: category.parent_id, subcategoryId: category.id };
  }

  return { parentId: category.id, subcategoryId: "" };
}

export function formatCategoryLabel(
  categories: Category[],
  categoryId: string | null | undefined
): string {
  if (!categoryId) return "";

  const category = findCategory(categories, categoryId);
  if (!category) return "";

  if (category.parent_id) {
    const parent = findCategory(categories, category.parent_id);
    if (parent) return `${parent.name} · ${category.name}`;
  }

  return category.name;
}
