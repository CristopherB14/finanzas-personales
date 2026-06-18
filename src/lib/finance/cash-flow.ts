import { format, subMonths, addMonths, startOfMonth, endOfMonth } from "date-fns";
import type { Transaction } from "@/types/database";

export interface CashFlowFilters {
  fromDate: string;
  toDate: string;
  accountId: string;
  categoryId: string;
}

export interface CashFlowRow {
  transaction: Transaction;
  deltaCents: number;
  runningBalanceCents: number;
  isFuture: boolean;
}

export function defaultCashFlowFilters(today = new Date()): CashFlowFilters {
  const from = startOfMonth(subMonths(today, 3));
  const to = endOfMonth(addMonths(today, 3));
  return {
    fromDate: format(from, "yyyy-MM-dd"),
    toDate: format(to, "yyyy-MM-dd"),
    accountId: "",
    categoryId: "",
  };
}

function isCashFlowTransaction(t: Transaction): boolean {
  return t.type === "income" || t.type === "expense";
}

function matchesAccountFilter(
  transaction: Transaction,
  accountId: string
): boolean {
  return !accountId || transaction.account_id === accountId;
}

export function computeOpeningBalance(
  transactions: Transaction[],
  filters: Pick<CashFlowFilters, "accountId" | "fromDate">
): number {
  let balance = 0;

  for (const transaction of transactions) {
    if (!isCashFlowTransaction(transaction)) continue;
    if (!matchesAccountFilter(transaction, filters.accountId)) continue;
    if (transaction.transaction_date >= filters.fromDate) continue;

    balance +=
      transaction.type === "income"
        ? transaction.amount_cents
        : -transaction.amount_cents;
  }

  return balance;
}

export function filterCashFlowTransactions(
  transactions: Transaction[],
  filters: CashFlowFilters
): Transaction[] {
  return transactions.filter((transaction) => {
    if (!isCashFlowTransaction(transaction)) return false;
    if (transaction.transaction_date < filters.fromDate) return false;
    if (transaction.transaction_date > filters.toDate) return false;
    if (!matchesAccountFilter(transaction, filters.accountId)) return false;
    if (filters.categoryId && transaction.category_id !== filters.categoryId) {
      return false;
    }
    return true;
  });
}

export function buildCashFlowRows(
  transactions: Transaction[],
  filters: CashFlowFilters,
  today = format(new Date(), "yyyy-MM-dd")
): { openingBalanceCents: number; rows: CashFlowRow[] } {
  const openingBalanceCents = computeOpeningBalance(transactions, filters);

  const filtered = filterCashFlowTransactions(transactions, filters).sort(
    (a, b) => {
      const dateCmp = a.transaction_date.localeCompare(b.transaction_date);
      if (dateCmp !== 0) return dateCmp;
      return (a.created_at ?? a.updated_at).localeCompare(
        b.created_at ?? b.updated_at
      );
    }
  );

  let runningBalanceCents = openingBalanceCents;
  const rows: CashFlowRow[] = filtered.map((transaction) => {
    const deltaCents =
      transaction.type === "income"
        ? transaction.amount_cents
        : -transaction.amount_cents;
    runningBalanceCents += deltaCents;

    return {
      transaction,
      deltaCents,
      runningBalanceCents,
      isFuture: transaction.transaction_date > today,
    };
  });

  return { openingBalanceCents, rows };
}
