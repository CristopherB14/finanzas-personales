export type AccountType =
  | "cash"
  | "checking"
  | "savings"
  | "credit_card"
  | "investment"
  | "other";

export type CategoryType = "income" | "expense" | "investment";

export type TransactionType = "income" | "expense" | "investment" | "transfer";

export interface Profile {
  id: string;
  display_name: string | null;
  default_currency: string;
  preferences: Record<string, unknown>;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: AccountType;
  icon: string | null;
  color: string | null;
  balance_cents: number;
  currency_code: string;
  is_default: boolean;
  client_id?: string | null;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  sort_order: number;
  client_id?: string | null;
  updated_at: string;
}

export interface InvestmentAsset {
  id: string;
  user_id: string;
  category_id: string;
  subcategory_id: string;
  invested_cents: number;
  market_value_cents: number | null;
  currency_code: string;
  client_id?: string | null;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  investment_asset_id?: string | null;
  type: TransactionType;
  amount_cents: number;
  currency_code: string;
  transaction_date: string;
  description: string | null;
  tags: string[];
  client_id: string;
  updated_at: string;
  created_at?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  period_type: "monthly" | "yearly";
  year: number;
  month: number | null;
}

export interface BudgetLine {
  id: string;
  budget_id: string;
  category_id: string;
  limit_cents: number;
}

export type SyncStatus = "synced" | "pending" | "error";

export interface LocalTransaction extends Transaction {
  _syncStatus?: SyncStatus;
  _localOnly?: boolean;
}
