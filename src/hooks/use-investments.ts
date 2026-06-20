"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCategories } from "@/lib/data/categories";
import { fetchInvestmentAssets } from "@/lib/data/investment-assets";
import {
  buildPortfolioSummary,
  investmentTransactions,
} from "@/lib/finance/investments";
import type { InvestmentAsset, Transaction } from "@/types/database";

export function useInvestments(
  userId: string | undefined,
  transactions: Transaction[]
) {
  const [categories, setCategories] = useState<Awaited<
    ReturnType<typeof fetchCategories>
  >>([]);
  const [assets, setAssets] = useState<InvestmentAsset[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = Boolean(userId) && dataLoading;

  const refresh = useCallback(async () => {
    if (!userId) return;
    setDataLoading(true);
    const [cats, loadedAssets] = await Promise.all([
      fetchCategories(userId, "investment"),
      fetchInvestmentAssets(userId),
    ]);
    setCategories(cats);
    setAssets(loadedAssets);
    setDataLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void Promise.all([
      fetchCategories(userId, "investment"),
      fetchInvestmentAssets(userId),
    ]).then(([cats, loadedAssets]) => {
      if (!cancelled) {
        setCategories(cats);
        setAssets(loadedAssets);
        setDataLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const investments = useMemo(
    () => investmentTransactions(transactions),
    [transactions]
  );

  const portfolio = useMemo(
    () => buildPortfolioSummary(transactions, categories, assets),
    [transactions, categories, assets]
  );

  return {
    categories,
    assets,
    investments,
    portfolio,
    loading,
    refresh,
  };
}
