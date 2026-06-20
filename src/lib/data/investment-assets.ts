import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import { investedBySubcategory } from "@/lib/finance/investments";
import type { Category, InvestmentAsset, Transaction } from "@/types/database";

export async function fetchInvestmentAssets(
  userId: string
): Promise<InvestmentAsset[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("investment_assets")
    .select("*")
    .eq("user_id", userId);
  return data ?? [];
}

export async function ensureInvestmentAsset(
  userId: string,
  categoryId: string,
  subcategoryId: string,
  currencyCode: string
): Promise<InvestmentAsset> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("investment_assets")
    .select("*")
    .eq("user_id", userId)
    .eq("subcategory_id", subcategoryId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("investment_assets")
    .insert({
      user_id: userId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      invested_cents: 0,
      market_value_cents: null,
      currency_code: currencyCode,
      client_id: uuidv4(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function syncInvestmentAssetBalances(
  userId: string,
  transactions: Transaction[],
  categories: Category[]
): Promise<void> {
  const investedMap = investedBySubcategory(transactions);
  const assets = await fetchInvestmentAssets(userId);
  const supabase = createClient();

  for (const [subcategoryId, investedCents] of Object.entries(investedMap)) {
    const sub = categories.find((c) => c.id === subcategoryId);
    if (!sub?.parent_id) continue;

    let asset = assets.find((a) => a.subcategory_id === subcategoryId);
    if (!asset) {
      asset = await ensureInvestmentAsset(
        userId,
        sub.parent_id,
        subcategoryId,
        "ARS"
      );
    }

    await supabase
      .from("investment_assets")
      .update({ invested_cents: investedCents })
      .eq("id", asset.id)
      .eq("user_id", userId);
  }
}

export async function recalculateAllInvestmentAssets(
  userId: string,
  transactions: Transaction[],
  categories: Category[]
): Promise<void> {
  await syncInvestmentAssetBalances(userId, transactions, categories);
}
