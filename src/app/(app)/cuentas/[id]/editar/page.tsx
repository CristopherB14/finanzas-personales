"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountForm } from "@/components/accounts/account-form";
import { useUser } from "@/hooks/use-user";
import { useAccounts } from "@/hooks/use-accounts";

export default function EditarCuentaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: accountId } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const { accounts, loading, editAccount, removeAccount } = useAccounts(user?.id);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const account = useMemo(() => {
    if (loading) return null;
    return accounts.find((a) => a.id === accountId) ?? null;
  }, [accountId, accounts, loading]);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  if (loading) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">No se encontró la cuenta.</p>
        <Link href="/cuentas" className="text-emerald-700 hover:underline">
          Volver a cuentas
        </Link>
      </div>
    );
  }

  return (
    <AccountForm
      key={account.id}
      mode="edit"
      initial={account}
      deleteError={deleteError}
      onSubmit={async (data) => {
        await editAccount(account.id, data);
      }}
      onDelete={async () => {
        setDeleteError(null);
        const result = await removeAccount(account.id);
        if (!result.ok && result.reason === "has_transactions") {
          setDeleteError(
            "No podés eliminar esta cuenta porque tiene movimientos asociados. Reasigná o eliminá esos movimientos primero."
          );
          return;
        }
        router.push("/cuentas");
        router.refresh();
      }}
    />
  );
}
