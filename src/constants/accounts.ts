import type { AccountType } from "@/types/database";

export interface AccountTypeOption {
  type: AccountType;
  label: string;
  icon: string;
  color: string;
}

export const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  { type: "cash", label: "Efectivo", icon: "banknote", color: "#22c55e" },
  { type: "checking", label: "Cuenta corriente", icon: "landmark", color: "#3b82f6" },
  { type: "savings", label: "Caja de ahorro", icon: "piggy-bank", color: "#8b5cf6" },
  { type: "credit_card", label: "Tarjeta de crédito", icon: "credit-card", color: "#f59e0b" },
  { type: "investment", label: "Inversiones", icon: "trending-up", color: "#06b6d4" },
  { type: "other", label: "Otro", icon: "wallet", color: "#64748b" },
];

export function getAccountTypeOption(type: AccountType): AccountTypeOption {
  return (
    ACCOUNT_TYPE_OPTIONS.find((o) => o.type === type) ??
    ACCOUNT_TYPE_OPTIONS[ACCOUNT_TYPE_OPTIONS.length - 1]
  );
}
