import type { Account, Transaction } from "@/types/database";
import { accountBalanceFromTransactions } from "@/lib/data/accounts";
import {
  isCurrencyCode,
  resolveTransferAmounts,
  type ExchangeRateSource,
} from "@/lib/finance/currency";

export function validateTransferInput(
  input: {
    account_id: string;
    to_account_id: string;
    amount_cents: number;
    currency_code: string;
    original_amount_cents?: number;
    exchange_rate?: number | null;
    exchange_rate_source?: ExchangeRateSource | null;
  },
  accounts: Account[],
  transactions: Transaction[],
  excludeClientId?: string
): string | null {
  const originalAmount =
    input.original_amount_cents ?? input.amount_cents;

  if (originalAmount <= 0) {
    return "Ingresá un monto válido.";
  }

  if (!isCurrencyCode(input.currency_code)) {
    return "Moneda inválida. Usá ARS o USD.";
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

  let sourceDebitCents: number;
  try {
    const resolved = resolveTransferAmounts({
      originalAmountCents: originalAmount,
      movementCurrency: input.currency_code,
      sourceCurrency: sourceAccount.currency_code,
      destinationCurrency: destinationAccount.currency_code,
      exchangeRate: input.exchange_rate,
      exchangeRateSource: input.exchange_rate_source,
    });
    sourceDebitCents = resolved.amount_cents;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "No se pudo validar la conversión.";
  }

  const relevantTransactions = excludeClientId
    ? transactions.filter((t) => t.client_id !== excludeClientId)
    : transactions;

  const sourceBalance = accountBalanceFromTransactions(
    input.account_id,
    relevantTransactions,
    sourceAccount.type
  );

  if (sourceBalance < sourceDebitCents) {
    return "La cuenta origen no tiene saldo suficiente.";
  }

  return null;
}

export function isTransferTransaction(
  transaction: Transaction
): transaction is Transaction & { to_account_id: string } {
  return transaction.type === "transfer" && Boolean(transaction.to_account_id);
}
