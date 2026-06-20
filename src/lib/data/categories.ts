import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import { getCategoryIconOption } from "@/constants/category-icons";
import { getSubcategories } from "@/lib/categories/helpers";
import type { Category, CategoryType, Transaction } from "@/types/database";

export async function fetchCategories(
  userId: string,
  type?: CategoryType
): Promise<Category[]> {
  const supabase = createClient();
  let query = supabase.from("categories").select("*").eq("user_id", userId);
  if (type) query = query.eq("type", type);
  const { data } = await query.order("sort_order");
  return data ?? [];
}

async function nextSortOrder(
  userId: string,
  type: CategoryType,
  parentId: string | null
): Promise<number> {
  const supabase = createClient();
  let query = supabase
    .from("categories")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("type", type)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else {
    query = query.is("parent_id", null);
  }

  const { data: existing } = await query;
  return (existing?.[0]?.sort_order ?? -1) + 1;
}

export async function createCategory(
  userId: string,
  input: {
    name: string;
    type: CategoryType;
    icon?: string;
    color?: string;
  }
): Promise<Category> {
  const supabase = createClient();
  const defaults = getCategoryIconOption(input.icon ?? null);
  const sortOrder = await nextSortOrder(userId, input.type, null);

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      type: input.type,
      icon: input.icon ?? defaults.icon,
      color: input.color ?? defaults.color,
      parent_id: null,
      sort_order: sortOrder,
      client_id: uuidv4(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createSubcategory(
  userId: string,
  parentId: string,
  input: {
    name: string;
    icon?: string;
    color?: string;
  }
): Promise<Category> {
  const supabase = createClient();

  const { data: parent, error: parentError } = await supabase
    .from("categories")
    .select("*")
    .eq("id", parentId)
    .eq("user_id", userId)
    .is("parent_id", null)
    .maybeSingle();

  if (parentError) throw parentError;
  if (!parent) throw new Error("Categoría padre no encontrada");

  const defaults = getCategoryIconOption(input.icon ?? parent.icon ?? null);
  const sortOrder = await nextSortOrder(userId, parent.type, parentId);

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      type: parent.type,
      icon: input.icon ?? defaults.icon,
      color: input.color ?? parent.color ?? defaults.color,
      parent_id: parentId,
      sort_order: sortOrder,
      client_id: uuidv4(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: {
    name: string;
    icon?: string;
    color?: string;
  }
): Promise<Category> {
  const supabase = createClient();
  const defaults = getCategoryIconOption(input.icon ?? null);

  const { data, error } = await supabase
    .from("categories")
    .update({
      name: input.name.trim(),
      icon: input.icon ?? defaults.icon,
      color: input.color ?? defaults.color,
    })
    .eq("id", categoryId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSubcategory(
  userId: string,
  subcategoryId: string,
  input: {
    name: string;
    icon?: string;
    color?: string;
  }
): Promise<Category> {
  return updateCategory(userId, subcategoryId, input);
}

export function transactionCountByCategory(
  categoryId: string,
  transactions: Transaction[]
): number {
  return transactions.filter((t) => t.category_id === categoryId).length;
}

export async function getRemoteTransactionCountByCategory(
  userId: string,
  categoryId: string
): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("category_id", categoryId);

  if (error) throw error;
  return count ?? 0;
}

export async function getRemoteSubcategoryCount(
  userId: string,
  parentId: string
): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("parent_id", parentId);

  if (error) throw error;
  return count ?? 0;
}

export async function deleteCategory(
  userId: string,
  categoryId: string,
  localTransactions: Transaction[] = [],
  localCategories: Category[] = []
): Promise<
  | { ok: true }
  | { ok: false; reason: "has_transactions" | "has_subcategories" }
> {
  const subcategoryCount = getSubcategories(localCategories, categoryId).length;
  if (subcategoryCount > 0) {
    return { ok: false, reason: "has_subcategories" };
  }

  const remoteSubCount = await getRemoteSubcategoryCount(userId, categoryId);
  if (remoteSubCount > 0) {
    return { ok: false, reason: "has_subcategories" };
  }

  const localCount = transactionCountByCategory(categoryId, localTransactions);
  if (localCount > 0) {
    return { ok: false, reason: "has_transactions" };
  }

  const remoteCount = await getRemoteTransactionCountByCategory(
    userId,
    categoryId
  );
  if (remoteCount > 0) {
    return { ok: false, reason: "has_transactions" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", userId);

  if (error) throw error;
  return { ok: true };
}

export async function deleteSubcategory(
  userId: string,
  subcategoryId: string,
  localTransactions: Transaction[] = []
): Promise<{ ok: true } | { ok: false; reason: "has_transactions" }> {
  const localCount = transactionCountByCategory(
    subcategoryId,
    localTransactions
  );
  if (localCount > 0) {
    return { ok: false, reason: "has_transactions" };
  }

  const remoteCount = await getRemoteTransactionCountByCategory(
    userId,
    subcategoryId
  );
  if (remoteCount > 0) {
    return { ok: false, reason: "has_transactions" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", subcategoryId)
    .eq("user_id", userId)
    .not("parent_id", "is", null);

  if (error) throw error;
  return { ok: true };
}
