import type {
  CategoryBudgetConfig,
  SubcategoryBudgetConfig,
} from "@/types/budget";
import type { Account, Category, Transaction } from "@/types/database";
import { getSubcategories, isSubcategory } from "@/lib/categories/helpers";
import { cashBalancesByCurrency } from "@/lib/data/accounts";
import { investedByCurrency } from "@/lib/finance/investments";
import {
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";

export type TrafficLight = "green" | "yellow" | "red";

export interface MonthlySummary {
  incomeCents: number;
  expenseCents: number;
  investmentCents: number;
  savingsCents: number;
  savingsRate: number;
}

export type MonthlySummaryByCurrency = Record<string, MonthlySummary>;

export interface DashboardMetrics extends MonthlySummary {
  cashCents: number;
  investmentAssetsCents: number;
  netWorthCents: number;
  emergencyMonths: number;
  status: TrafficLight;
  statusMessage: string;
  cashByCurrency: Record<string, number>;
  incomeByCurrency: Record<string, number>;
  expenseByCurrency: Record<string, number>;
  investmentByCurrency: Record<string, number>;
  investedAssetsByCurrency: Record<string, number>;
  savingsByCurrency: Record<string, number>;
  netWorthByCurrency: Record<string, number>;
  primaryCurrency: string;
}

function emptyMonthlySummary(): MonthlySummary {
  return {
    incomeCents: 0,
    expenseCents: 0,
    investmentCents: 0,
    savingsCents: 0,
    savingsRate: 0,
  };
}

export function filterByMonth(
  transactions: Transaction[],
  year: number,
  month: number
): Transaction[] {
  const start = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const end = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  return transactions.filter(
    (t) => t.transaction_date >= start && t.transaction_date <= end
  );
}

export function summarizeMonthForCurrency(
  transactions: Transaction[]
): MonthlySummary {
  let incomeCents = 0;
  let expenseCents = 0;
  let investmentCents = 0;

  for (const t of transactions) {
    if (t.type === "income") incomeCents += t.amount_cents;
    if (t.type === "expense") expenseCents += t.amount_cents;
    if (t.type === "investment") investmentCents += t.amount_cents;
  }

  const savingsCents = incomeCents - expenseCents - investmentCents;
  const savingsRate =
    incomeCents > 0 ? (savingsCents / incomeCents) * 100 : 0;

  return {
    incomeCents,
    expenseCents,
    investmentCents,
    savingsCents,
    savingsRate,
  };
}

/** Summaries keyed by account currency — never mixes ARS and USD. */
export function summarizeMonthByCurrency(
  transactions: Transaction[],
  accounts: Account[]
): MonthlySummaryByCurrency {
  const accountCurrency = new Map(
    accounts.map((a) => [a.id, a.currency_code || "ARS"])
  );
  const buckets: Record<
    string,
    { incomeCents: number; expenseCents: number; investmentCents: number }
  > = {};

  for (const t of transactions) {
    if (t.type === "transfer") continue;
    const currency =
      accountCurrency.get(t.account_id) ?? t.currency_code ?? "ARS";
    if (!buckets[currency]) {
      buckets[currency] = {
        incomeCents: 0,
        expenseCents: 0,
        investmentCents: 0,
      };
    }
    if (t.type === "income") buckets[currency].incomeCents += t.amount_cents;
    if (t.type === "expense") buckets[currency].expenseCents += t.amount_cents;
    if (t.type === "investment") {
      buckets[currency].investmentCents += t.amount_cents;
    }
  }

  const result: MonthlySummaryByCurrency = {};
  for (const [currency, bucket] of Object.entries(buckets)) {
    const savingsCents =
      bucket.incomeCents - bucket.expenseCents - bucket.investmentCents;
    result[currency] = {
      ...bucket,
      savingsCents,
      savingsRate:
        bucket.incomeCents > 0
          ? (savingsCents / bucket.incomeCents) * 100
          : 0,
    };
  }
  return result;
}

export function summarizeMonth(
  transactions: Transaction[],
  accounts?: Account[]
): MonthlySummary {
  if (!accounts || accounts.length === 0) {
    return summarizeMonthForCurrency(transactions);
  }
  const byCurrency = summarizeMonthByCurrency(transactions, accounts);
  if (byCurrency.ARS) return byCurrency.ARS;
  return Object.values(byCurrency)[0] ?? emptyMonthlySummary();
}

export function pickPrimaryCurrency(
  amounts: Record<string, number>,
  fallback = "ARS"
): string {
  if (amounts.ARS != null) return "ARS";
  const keys = Object.keys(amounts);
  return keys[0] ?? fallback;
}

export function savingsTrafficLight(rate: number): TrafficLight {
  if (rate >= 20) return "green";
  if (rate >= 10) return "yellow";
  return "red";
}

export function statusMessage(light: TrafficLight): string {
  switch (light) {
    case "green":
      return "Vas bien este mes. Seguí así.";
    case "yellow":
      return "Podés mejorar tu ahorro este mes.";
    case "red":
      return "Estás gastando más de lo que ingresás.";
  }
}

export function emergencyMonths(
  fundCents: number,
  avgMonthlyExpenseCents: number
): number {
  if (avgMonthlyExpenseCents <= 0) return 0;
  return fundCents / avgMonthlyExpenseCents;
}

export function buildDashboardMetrics(
  transactions: Transaction[],
  year: number,
  month: number,
  accounts: Account[],
  emergencyFundCents?: number
): DashboardMetrics {
  const monthTx = filterByMonth(transactions, year, month);
  const byCurrency = summarizeMonthByCurrency(monthTx, accounts);
  const primaryCurrency = pickPrimaryCurrency(
    Object.fromEntries(
      Object.entries(byCurrency).map(([c, s]) => [c, s.incomeCents + s.expenseCents])
    ),
    accounts[0]?.currency_code ?? "ARS"
  );
  const summary = byCurrency[primaryCurrency] ?? emptyMonthlySummary();
  const status = savingsTrafficLight(summary.savingsRate);

  const last3 = [0, 1, 2].map((i) => {
    const d = subMonths(new Date(year, month - 1), i);
    const monthSummary = summarizeMonthByCurrency(
      filterByMonth(transactions, d.getFullYear(), d.getMonth() + 1),
      accounts
    );
    return monthSummary[primaryCurrency]?.expenseCents ?? 0;
  });
  const avgExpense =
    last3.reduce((a, b) => a + b, 0) / (last3.filter((e) => e > 0).length || 1);

  const cashByCurrency = cashBalancesByCurrency(transactions, accounts);
  const investmentByCurrencyMap = investedByCurrency(transactions, accounts);
  const netWorthByCurrency: Record<string, number> = {};
  const allCurrencies = new Set([
    ...Object.keys(cashByCurrency),
    ...Object.keys(investmentByCurrencyMap),
  ]);
  for (const currency of allCurrencies) {
    netWorthByCurrency[currency] =
      (cashByCurrency[currency] ?? 0) +
      (investmentByCurrencyMap[currency] ?? 0);
  }

  const cashCents = cashByCurrency[primaryCurrency] ?? 0;
  const investmentAssetsCents = investmentByCurrencyMap[primaryCurrency] ?? 0;
  const netWorthCents = cashCents + investmentAssetsCents;

  const fund = emergencyFundCents ?? cashCents;
  const months = emergencyMonths(fund, avgExpense);

  const incomeByCurrency: Record<string, number> = {};
  const expenseByCurrency: Record<string, number> = {};
  const investmentMonthByCurrency: Record<string, number> = {};
  const savingsByCurrency: Record<string, number> = {};
  for (const [currency, s] of Object.entries(byCurrency)) {
    incomeByCurrency[currency] = s.incomeCents;
    expenseByCurrency[currency] = s.expenseCents;
    investmentMonthByCurrency[currency] = s.investmentCents;
    savingsByCurrency[currency] = s.savingsCents;
  }

  return {
    ...summary,
    cashCents,
    investmentAssetsCents,
    netWorthCents,
    emergencyMonths: months,
    status,
    statusMessage: statusMessage(status),
    cashByCurrency,
    incomeByCurrency,
    expenseByCurrency,
    investmentByCurrency: investmentMonthByCurrency,
    investedAssetsByCurrency: investmentByCurrencyMap,
    savingsByCurrency,
    netWorthByCurrency,
    primaryCurrency,
  };
}

export interface ChartPoint {
  label: string;
  income: number;
  expenses: number;
  savings: number;
}

export function last6MonthsChart(
  transactions: Transaction[],
  refDate = new Date(),
  accounts: Account[] = [],
  currency = "ARS"
): ChartPoint[] {
  const points: ChartPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = subMonths(refDate, i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const monthTx = filterByMonth(transactions, y, m);
    const s =
      accounts.length > 0
        ? summarizeMonthByCurrency(monthTx, accounts)[currency] ??
          emptyMonthlySummary()
        : summarizeMonthForCurrency(monthTx);
    points.push({
      label: format(d, "MMM"),
      income: s.incomeCents / 100,
      expenses: s.expenseCents / 100,
      savings: s.savingsCents / 100,
    });
  }

  return points;
}

export function resolveCategoryBudgetLimit(
  config: CategoryBudgetConfig | undefined,
  monthlyIncomeCents: number
): number {
  if (!config) return 0;

  if (config.mode === "percentage") {
    if (monthlyIncomeCents <= 0 || config.percentage <= 0) return 0;
    return Math.round((monthlyIncomeCents * config.percentage) / 100);
  }

  return Math.max(0, config.fixedCents);
}

export function computeBudgetLimits(
  categories: Record<string, CategoryBudgetConfig>,
  monthlyIncomeCents: number
): Record<string, number> {
  const limits: Record<string, number> = {};
  for (const [categoryId, config] of Object.entries(categories)) {
    limits[categoryId] = resolveCategoryBudgetLimit(config, monthlyIncomeCents);
  }
  return limits;
}

export function resolveSubcategoryBudgetLimit(
  config: SubcategoryBudgetConfig | undefined,
  categoryLimitCents: number
): number {
  if (!config) return 0;

  if (config.mode === "percentage") {
    if (categoryLimitCents <= 0 || config.percentage <= 0) return 0;
    return Math.round((categoryLimitCents * config.percentage) / 100);
  }

  return Math.max(0, config.fixedCents);
}

export function computeSubcategoryBudgetLimits(
  subcategoryConfigs: Record<string, SubcategoryBudgetConfig>,
  categoryLimitCents: number
): Record<string, number> {
  const limits: Record<string, number> = {};
  for (const [subcategoryId, config] of Object.entries(subcategoryConfigs)) {
    limits[subcategoryId] = resolveSubcategoryBudgetLimit(
      config,
      categoryLimitCents
    );
  }
  return limits;
}

export function computeSpentByCategoryId(
  transactions: Transaction[],
  type: "income" | "expense" | "investment"
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const transaction of transactions) {
    if (transaction.type !== type || !transaction.category_id) continue;
    map[transaction.category_id] =
      (map[transaction.category_id] ?? 0) + transaction.amount_cents;
  }
  return map;
}

export function computeCategorySpentCents(
  categoryId: string,
  categories: Category[],
  spentByCategoryId: Record<string, number>
): number {
  let total = spentByCategoryId[categoryId] ?? 0;

  for (const sub of getSubcategories(categories, categoryId)) {
    total += spentByCategoryId[sub.id] ?? 0;
  }

  return total;
}

export function isLegacyCategoryTransaction(
  categoryId: string,
  categories: Category[]
): boolean {
  const category = categories.find((c) => c.id === categoryId);
  return Boolean(category && !isSubcategory(category));
}

export function budgetUsagePercent(
  spentCents: number,
  limitCents: number
): number {
  if (limitCents <= 0) return 0;
  return Math.min(150, (spentCents / limitCents) * 100);
}

export function budgetTrafficLight(percent: number): TrafficLight {
  if (percent < 80) return "green";
  if (percent <= 100) return "yellow";
  return "red";
}
