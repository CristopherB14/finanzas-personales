import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@/constants/categories";
import { migrateOrphanTransactions } from "@/lib/data/accounts";

export async function ensureUserSetup(userId: string) {
  const supabase = createClient();

  await migrateOrphanTransactions(userId);

  const { data: categories } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (!categories?.length) {
    const expenseRows = DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
      user_id: userId,
      name: c.name,
      type: "expense" as const,
      icon: c.icon,
      color: c.color,
      sort_order: i,
      client_id: uuidv4(),
    }));
    const incomeRows = DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
      user_id: userId,
      name: c.name,
      type: "income" as const,
      icon: c.icon,
      color: c.color,
      sort_order: i,
      client_id: uuidv4(),
    }));
    await supabase.from("categories").insert([...expenseRows, ...incomeRows]);
  }
}

export async function fetchCategories(
  userId: string,
  type?: "income" | "expense"
) {
  const supabase = createClient();
  let q = supabase.from("categories").select("*").eq("user_id", userId);
  if (type) q = q.eq("type", type);
  const { data } = await q.order("sort_order");
  return data ?? [];
}
