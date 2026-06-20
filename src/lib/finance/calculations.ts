import type {
  CategoryBudgetConfig,
  SubcategoryBudgetConfig,
} from "@/types/budget";
import type { Category, Transaction } from "@/types/database";
import { getSubcategories, isSubcategory } from "@/lib/categories/helpers";
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
  savingsCents: number;
  savingsRate: number;
}

export interface DashboardMetrics extends MonthlySummary {
  netWorthCents: number;
  emergencyMonths: number;
  status: TrafficLight;
  statusMessage: string;
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

export function summarizeMonth(transactions: Transaction[]): MonthlySummary {
  let incomeCents = 0;
  let expenseCents = 0;

  for (const t of transactions) {
    if (t.type === "income") incomeCents += t.amount_cents;
    if (t.type === "expense") expenseCents += t.amount_cents;
  }

  const savingsCents = incomeCents - expenseCents;
  const savingsRate =
    incomeCents > 0 ? (savingsCents / incomeCents) * 100 : 0;

  return { incomeCents, expenseCents, savingsCents, savingsRate };
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
  accountBalanceCents: number,
  emergencyFundCents?: number
): DashboardMetrics {
  const monthTx = filterByMonth(transactions, year, month);
  const summary = summarizeMonth(monthTx);
  const status = savingsTrafficLight(summary.savingsRate);

  const last3 = [0, 1, 2].map((i) => {
    const d = subMonths(new Date(year, month - 1), i);
    return summarizeMonth(
      filterByMonth(transactions, d.getFullYear(), d.getMonth() + 1)
    ).expenseCents;
  });
  const avgExpense =
    last3.reduce((a, b) => a + b, 0) / (last3.filter((e) => e > 0).length || 1);

  const fund = emergencyFundCents ?? accountBalanceCents;
  const months = emergencyMonths(fund, avgExpense);

  return {
    ...summary,
    netWorthCents: accountBalanceCents,
    emergencyMonths: months,
    status,
    statusMessage: statusMessage(status),
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
  refDate = new Date()
): ChartPoint[] {
  const points: ChartPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = subMonths(refDate, i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const s = summarizeMonth(filterByMonth(transactions, y, m));
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
  type: "income" | "expense"
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
