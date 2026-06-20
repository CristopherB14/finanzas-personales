import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import {
  MIGRATION_EXPENSE_CATEGORIES,
  MIGRATION_INCOME_CATEGORIES,
} from "@/lib/categories/migration-defaults";
import { migrateOrphanTransactions } from "@/lib/data/accounts";
import {
  ensureInvestmentCategories,
  migrateInvestmentCategories,
} from "@/lib/data/investment-migration";

const setupPromises = new Map<string, Promise<void>>();

async function runUserSetup(userId: string): Promise<void> {
  const supabase = createClient();

  await migrateOrphanTransactions(userId);

  const { data: categories } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (!categories?.length) {
    const expenseRows = MIGRATION_EXPENSE_CATEGORIES.map((c, i) => ({
      user_id: userId,
      name: c.name,
      type: "expense" as const,
      icon: c.icon,
      color: c.color,
      sort_order: i,
      client_id: uuidv4(),
    }));
    const incomeRows = MIGRATION_INCOME_CATEGORIES.map((c, i) => ({
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

  await migrateInvestmentCategories(userId);
  await ensureInvestmentCategories(userId);
}

export function ensureUserSetup(userId: string): Promise<void> {
  const existing = setupPromises.get(userId);
  if (existing) return existing;

  const promise = runUserSetup(userId).catch((error) => {
    setupPromises.delete(userId);
    throw error;
  });
  setupPromises.set(userId, promise);
  return promise;
}
