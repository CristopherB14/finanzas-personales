"use client";

import { TransferForm } from "@/components/transactions/transfer-form";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";

export default function NuevaTransferenciaPage() {
  const { user } = useUser();
  const { transactions, addTransaction } = useTransactions(user?.id);
  const { accounts, addAccount } = useAccounts(user?.id);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  if (accounts.length < 2) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-bold">Nueva transferencia</h1>
        <p className="text-slate-600">
          Necesitás al menos dos cuentas para registrar una transferencia.
        </p>
      </div>
    );
  }

  return (
    <TransferForm
      mode="create"
      accounts={accounts}
      transactions={transactions}
      onSubmit={async (data) => {
        await addTransaction(data);
      }}
      onCreateAccount={addAccount}
    />
  );
}
