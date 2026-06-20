import type { Account, Transaction } from "@/types/database";
import { accountBalanceFromTransactions } from "@/lib/data/accounts";

export function validateTransferInput(
  input: {
    account_id: string;
    to_account_id: string;
    amount_cents: number;
    currency_code: string;
  },
  accounts: Account[],
  transactions: Transaction[],
  excludeClientId?: string
): string | null {
  if (input.amount_cents <= 0) {
    return "Ingresá un monto válido.";
  }

  if (input.account_id === input.to_account_id) {
    return "Las cuentas origen y destino deben ser distintas.";
  }

  const sourceAccount = accounts.find((a) => a.id === input.account_id);
  const destinationAccount = accounts.find((a) => a.id === input.to_account_id);

  if (!sourceAccount) {
    return "Seleccioná una cuenta origen.";
  }

  if (!destinationAccount) {
    return "Seleccioná una cuenta destino.";
  }

  if (sourceAccount.currency_code !== destinationAccount.currency_code) {
    return "Las cuentas deben usar la misma moneda.";
  }

  const relevantTransactions = excludeClientId
    ? transactions.filter((t) => t.client_id !== excludeClientId)
    : transactions;

  const sourceBalance = accountBalanceFromTransactions(
    input.account_id,
    relevantTransactions,
    sourceAccount.type
  );

  if (sourceBalance < input.amount_cents) {
    return "La cuenta origen no tiene saldo suficiente.";
  }

  return null;
}

export function isTransferTransaction(
  transaction: Transaction
): transaction is Transaction & { to_account_id: string } {
  return transaction.type === "transfer" && Boolean(transaction.to_account_id);
}
