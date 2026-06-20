import { getSubcategories, isSubcategory } from "@/lib/categories/helpers";
import type { Category, InvestmentAsset, Transaction } from "@/types/database";

export interface PortfolioHolding {
  asset: InvestmentAsset | null;
  subcategoryId: string;
  subcategoryName: string;
  categoryId: string;
  categoryName: string;
  investedCents: number;
  marketValueCents: number;
  allocationPercent: number;
}

export interface PortfolioSummary {
  totalInvestedCents: number;
  totalMarketValueCents: number;
  holdings: PortfolioHolding[];
}

export function resolveAssetMarketValue(asset: InvestmentAsset): number {
  return asset.market_value_cents ?? asset.invested_cents;
}

export function investedBySubcategory(
  transactions: Transaction[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.type !== "investment" || !tx.category_id) continue;
    map[tx.category_id] = (map[tx.category_id] ?? 0) + tx.amount_cents;
  }
  return map;
}

export function totalInvestedCents(transactions: Transaction[]): number {
  return transactions.reduce(
    (sum, tx) => (tx.type === "investment" ? sum + tx.amount_cents : sum),
    0
  );
}

export function buildPortfolioSummary(
  transactions: Transaction[],
  categories: Category[],
  assets: InvestmentAsset[] = []
): PortfolioSummary {
  const investedMap = investedBySubcategory(transactions);
  const assetBySub = new Map(assets.map((a) => [a.subcategory_id, a]));
  const investmentCategories = categories.filter(
    (c) => c.type === "investment" && !isSubcategory(c)
  );

  const holdings: PortfolioHolding[] = [];

  for (const category of investmentCategories) {
    for (const sub of getSubcategories(categories, category.id)) {
      const investedCents = investedMap[sub.id] ?? 0;
      if (investedCents <= 0 && !assetBySub.has(sub.id)) continue;

      const asset = assetBySub.get(sub.id) ?? null;
      const marketValueCents = asset
        ? resolveAssetMarketValue({ ...asset, invested_cents: investedCents })
        : investedCents;

      holdings.push({
        asset,
        subcategoryId: sub.id,
        subcategoryName: sub.name,
        categoryId: category.id,
        categoryName: category.name,
        investedCents,
        marketValueCents,
        allocationPercent: 0,
      });
    }
  }

  const totalInvested = holdings.reduce((s, h) => s + h.investedCents, 0);
  const totalMarketValue = holdings.reduce((s, h) => s + h.marketValueCents, 0);

  for (const holding of holdings) {
    holding.allocationPercent =
      totalMarketValue > 0
        ? (holding.marketValueCents / totalMarketValue) * 100
        : 0;
  }

  holdings.sort((a, b) => b.marketValueCents - a.marketValueCents);

  return {
    totalInvestedCents: totalInvested,
    totalMarketValueCents: totalMarketValue,
    holdings,
  };
}

export function investmentTransactions(
  transactions: Transaction[]
): Transaction[] {
  return transactions.filter((t) => t.type === "investment");
}
