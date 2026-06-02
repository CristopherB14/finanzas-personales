import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@/constants/categories";

export async function ensureUserSetup(userId: string, currency = "ARS") {
  const supabase = createClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (!accounts?.length) {
    await supabase.from("accounts").insert({
      user_id: userId,
      name: "Cuenta principal",
      type: "checking",
      balance_cents: 0,
      currency_code: currency,
      is_default: true,
      client_id: uuidv4(),
    });
  }

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

export async function fetchAccounts(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false });
  return data ?? [];
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
