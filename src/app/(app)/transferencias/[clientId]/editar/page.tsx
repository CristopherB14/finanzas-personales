"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TransferForm } from "@/components/transactions/transfer-form";
import { useUser } from "@/hooks/use-user";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";

export default function EditarTransferenciaPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const {
    transactions,
    loading,
    editTransaction,
    removeTransaction,
    getTransactionByClientId,
  } = useTransactions(user?.id);
  const { accounts, addAccount } = useAccounts(user?.id);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const transaction = getTransactionByClientId(clientId);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  if (loading) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  if (!transaction || transaction.type !== "transfer") {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">No se encontró la transferencia.</p>
        <Link href="/transferencias" className="text-emerald-700 hover:underline">
          Volver a transferencias
        </Link>
      </div>
    );
  }

  return (
    <TransferForm
      key={transaction.client_id}
      mode="edit"
      initial={transaction}
      accounts={accounts}
      transactions={transactions}
      deleteError={deleteError}
      onSubmit={async (data) => {
        await editTransaction(clientId, data);
      }}
      onCreateAccount={addAccount}
      onDelete={async () => {
        setDeleteError(null);
        try {
          await removeTransaction(clientId);
          router.push("/transferencias");
          router.refresh();
        } catch {
          setDeleteError("No se pudo eliminar la transferencia.");
        }
      }}
    />
  );
}
