import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import { getCategoryIconOption } from "@/constants/category-icons";
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
  const { data: existing } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("type", input.type)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      type: input.type,
      icon: input.icon ?? defaults.icon,
      color: input.color ?? defaults.color,
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

export async function deleteCategory(
  userId: string,
  categoryId: string,
  localTransactions: Transaction[] = []
): Promise<{ ok: true } | { ok: false; reason: "has_transactions" }> {
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
