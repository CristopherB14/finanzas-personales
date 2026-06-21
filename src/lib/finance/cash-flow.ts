import { format, subMonths, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { ROUTES } from "@/constants/routes";
import type { Transaction, TransactionType } from "@/types/database";

export type CashFlowTypeFilter =
  | "all"
  | "income"
  | "expense"
  | "investment"
  | "transfer";

export interface CashFlowFilters {
  fromDate: string;
  toDate: string;
  accountId: string;
  categoryId: string;
  typeFilter: CashFlowTypeFilter;
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
    typeFilter: "all",
  };
}

function isCashFlowTransaction(t: Transaction): boolean {
  return (
    t.type === "income" || t.type === "expense" || t.type === "investment"
  );
}

function isTransferTransaction(
  t: Transaction
): t is Transaction & { to_account_id: string } {
  return t.type === "transfer" && Boolean(t.to_account_id);
}

function matchesTypeFilter(
  transaction: Transaction,
  typeFilter: CashFlowTypeFilter
): boolean {
  if (typeFilter === "all") return isCashFlowTransaction(transaction);
  if (typeFilter === "transfer") return isTransferTransaction(transaction);
  return transaction.type === typeFilter;
}

function transactionDelta(transaction: Transaction): number {
  if (transaction.type === "transfer") return 0;
  if (transaction.type === "income") return transaction.amount_cents;
  return -transaction.amount_cents;
}

function matchesAccountFilter(
  transaction: Transaction,
  accountId: string
): boolean {
  if (!accountId) return true;
  if (transaction.account_id === accountId) return true;
  return (
    transaction.type === "transfer" &&
    transaction.to_account_id === accountId
  );
}

export function computeOpeningBalance(
  transactions: Transaction[],
  filters: Pick<CashFlowFilters, "accountId" | "fromDate" | "typeFilter">
): number {
  let balance = 0;

  for (const transaction of transactions) {
    if (!isCashFlowTransaction(transaction)) continue;
    if (filters.typeFilter !== "all" && filters.typeFilter !== transaction.type) {
      continue;
    }
    if (!matchesAccountFilter(transaction, filters.accountId)) continue;
    if (transaction.transaction_date >= filters.fromDate) continue;

    balance += transactionDelta(transaction);
  }

  return balance;
}

export function filterCashFlowTransactions(
  transactions: Transaction[],
  filters: CashFlowFilters
): Transaction[] {
  return transactions.filter((transaction) => {
    if (!matchesTypeFilter(transaction, filters.typeFilter)) return false;
    if (transaction.transaction_date < filters.fromDate) return false;
    if (transaction.transaction_date > filters.toDate) return false;
    if (!matchesAccountFilter(transaction, filters.accountId)) return false;
    if (
      filters.categoryId &&
      transaction.category_id !== filters.categoryId
    ) {
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
    const deltaCents = transactionDelta(transaction);
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

export function cashFlowEditPath(transaction: Transaction): string {
  switch (transaction.type as TransactionType) {
    case "income":
    case "expense":
      return ROUTES.editTransaction(transaction.client_id);
    case "investment":
      return `/inversiones/${transaction.client_id}/editar`;
    case "transfer":
      return `/transferencias/${transaction.client_id}/editar`;
    default:
      return ROUTES.editTransaction(transaction.client_id);
  }
}
