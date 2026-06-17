"use client";

import { AccountForm } from "@/components/accounts/account-form";
import { useUser } from "@/hooks/use-user";
import { useAccounts } from "@/hooks/use-accounts";

export default function NuevaCuentaPage() {
  const { user } = useUser();
  const { addAccount } = useAccounts(user?.id);

  if (!user) return <p>Iniciá sesión para continuar.</p>;

  return (
    <AccountForm
      mode="create"
      onSubmit={async (data) => {
        await addAccount(data);
      }}
    />
  );
}
