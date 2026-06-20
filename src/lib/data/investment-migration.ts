import { createClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";
import {
  MIGRATION_INVESTMENT_CATEGORIES,
  MIGRATION_INVESTMENT_SUBCATEGORIES,
} from "@/lib/categories/migration-defaults";

const INVESTMENT_EXPENSE_CATEGORY_NAMES = new Set([
  "inversiones",
  "inversión",
  "inversion",
  "investment",
  "investments",
  "crecimiento",
  "growth",
]);

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export async function migrateInvestmentCategories(userId: string): Promise<void> {
  const supabase = createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId);

  if (!categories?.length) return;

  const expenseParents = categories.filter(
    (c) =>
      c.type === "expense" &&
      !c.parent_id &&
      INVESTMENT_EXPENSE_CATEGORY_NAMES.has(normalizeName(c.name))
  );

  for (const parent of expenseParents) {
    await supabase
      .from("categories")
      .update({ type: "investment" })
      .eq("id", parent.id)
      .eq("user_id", userId);

    const children = categories.filter((c) => c.parent_id === parent.id);
    for (const child of children) {
      await supabase
        .from("categories")
        .update({ type: "investment" })
        .eq("id", child.id)
        .eq("user_id", userId);
    }

    const categoryIds = [parent.id, ...children.map((c) => c.id)];
    await supabase
      .from("transactions")
      .update({ type: "investment" })
      .eq("user_id", userId)
      .eq("type", "expense")
      .in("category_id", categoryIds);
  }
}

export async function ensureInvestmentCategories(userId: string): Promise<void> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "investment")
    .limit(1);

  if (existing?.length) return;

  const { data: parent, error: parentError } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: MIGRATION_INVESTMENT_CATEGORIES.name,
      type: "investment",
      icon: MIGRATION_INVESTMENT_CATEGORIES.icon,
      color: MIGRATION_INVESTMENT_CATEGORIES.color,
      sort_order: 0,
      client_id: uuidv4(),
    })
    .select()
    .single();

  if (parentError) throw parentError;

  const subRows = MIGRATION_INVESTMENT_SUBCATEGORIES.map((sub, i) => ({
    user_id: userId,
    name: sub.name,
    type: "investment" as const,
    icon: sub.icon,
    color: sub.color,
    parent_id: parent.id,
    sort_order: i,
    client_id: uuidv4(),
  }));

  await supabase.from("categories").insert(subRows);
}
