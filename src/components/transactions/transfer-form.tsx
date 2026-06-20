"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountIcon } from "@/components/accounts/account-icon";
import { AccountCreateDialog } from "@/components/transactions/account-create-dialog";
import {
  accountBalanceFromTransactions,
} from "@/lib/data/accounts";
import { validateTransferInput } from "@/lib/finance/transfers";
import { parseMoneyInput, formatMoney } from "@/lib/format";
import {
  choiceCard,
  emptyPanel,
  errorText,
  inlineAction,
  metaText,
} from "@/lib/a11y";
import { cn } from "@/lib/utils";
import type {
  Account,
  AccountType,
  LocalTransaction,
  Transaction,
} from "@/types/database";
import type { TransactionInput } from "@/hooks/use-transactions";

interface TransferFormProps {
  mode: "create" | "edit";
  accounts: Account[];
  transactions: Transaction[];
  initial?: LocalTransaction;
  onSubmit: (data: TransactionInput) => Promise<void>;
  onCreateAccount?: (data: {
    name: string;
    description?: string;
    type: AccountType;
    icon?: string;
    color?: string;
    currency_code?: string;
  }) => Promise<Account>;
  onDelete?: () => Promise<void>;
  deleteError?: string | null;
}

function formatAmountInput(cents: number): string {
  if (cents <= 0) return "";
  return String(cents / 100);
}

function InlineCreateButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(inlineAction, "h-8 gap-1 px-2")}
      onClick={onClick}
      disabled={disabled}
    >
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}

function AccountPicker({
  label,
  accounts,
  selectedId,
  onSelect,
  onCreate,
  excludeId,
}: {
  label: string;
  accounts: Account[];
  selectedId: string;
  onSelect: (accountId: string) => void;
  onCreate?: () => void;
  excludeId?: string;
}) {
  const options = excludeId
    ? accounts.filter((account) => account.id !== excludeId)
    : accounts;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {onCreate && (
          <InlineCreateButton label="Nueva" onClick={onCreate} />
        )}
      </div>
      {options.length === 0 ? (
        <p className={emptyPanel}>
          Todavía no tenés cuentas disponibles.
          {onCreate ? ' Tocá "Nueva" para crear una.' : " Creá una desde Cuentas."}
        </p>
      ) : (
        <div className="space-y-2">
          {options.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => onSelect(account.id)}
              className={choiceCard(selectedId === account.id)}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${account.color ?? "#64748b"}20`,
                  color: account.color ?? "#64748b",
                }}
              >
                <AccountIcon icon={account.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">{account.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TransferForm({
  mode,
  accounts,
  transactions,
  initial,
  onSubmit,
  onCreateAccount,
  onDelete,
  deleteError,
}: TransferFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState(() =>
    initial ? formatAmountInput(initial.amount_cents) : ""
  );
  const [fromAccountId, setFromAccountId] = useState(
    () => initial?.account_id ?? accounts[0]?.id ?? ""
  );
  const [toAccountId, setToAccountId] = useState(
    () => initial?.to_account_id ?? accounts[1]?.id ?? accounts[0]?.id ?? ""
  );
  const [date, setDate] = useState(
    () => initial?.transaction_date ?? format(new Date(), "yyyy-MM-dd")
  );
  const [description, setDescription] = useState(
    () => initial?.description ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountDialogTarget, setAccountDialogTarget] = useState<
    "from" | "to"
  >("from");

  const fromAccount = useMemo(
    () => accounts.find((account) => account.id === fromAccountId),
    [accounts, fromAccountId]
  );

  const title = mode === "create" ? "Nueva transferencia" : "Editar transferencia";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cents = parseMoneyInput(amount);
    if (!date) {
      setError("Ingresá una fecha.");
      return;
    }

    const currencyCode = fromAccount?.currency_code ?? "ARS";
    const validationError = validateTransferInput(
      {
        account_id: fromAccountId,
        to_account_id: toAccountId,
        amount_cents: cents,
        currency_code: currencyCode,
      },
      accounts,
      transactions,
      initial?.client_id
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        account_id: fromAccountId,
        to_account_id: toAccountId,
        category_id: null,
        type: "transfer",
        amount_cents: cents,
        currency_code: currencyCode,
        transaction_date: date,
        description: description || undefined,
      });
      router.push("/transferencias");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const openAccountDialog = (target: "from" | "to") => {
    setAccountDialogTarget(target);
    setAccountDialogOpen(true);
  };

  const sourceBalance = fromAccount
    ? accountBalanceFromTransactions(
        fromAccount.id,
        transactions.filter((t) => t.client_id !== initial?.client_id),
        fromAccount.type
      )
    : 0;

  return (
    <>
      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-5">
        <h1 className="text-2xl font-bold">{title}</h1>

        <div className="space-y-2">
          <Label htmlFor="amount">Monto</Label>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="$ 0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-2xl font-semibold"
            autoFocus
            required
          />
          {fromAccount && (
            <p className={metaText}>
              Saldo disponible en origen:{" "}
              {formatMoney(sourceBalance, fromAccount.currency_code)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <AccountPicker
          label="Cuenta origen"
          accounts={accounts}
          selectedId={fromAccountId}
          onSelect={setFromAccountId}
          onCreate={onCreateAccount ? () => openAccountDialog("from") : undefined}
          excludeId={toAccountId}
        />

        <AccountPicker
          label="Cuenta destino"
          accounts={accounts}
          selectedId={toAccountId}
          onSelect={setToAccountId}
          onCreate={onCreateAccount ? () => openAccountDialog("to") : undefined}
          excludeId={fromAccountId}
        />

        <div className="space-y-2">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Pago tarjeta desde banco"
          />
        </div>

        {error && <p className={errorText}>{error}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={saving}>
          {saving
            ? "Guardando…"
            : mode === "create"
              ? "Guardar"
              : "Guardar cambios"}
        </Button>

        {mode === "edit" && onDelete && (
          <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            {deleteError && (
              <p className={errorText}>{deleteError}</p>
            )}
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Eliminando…" : "Eliminar transferencia"}
            </Button>
          </div>
        )}
      </form>

      {onCreateAccount && (
        <AccountCreateDialog
          open={accountDialogOpen}
          onOpenChange={setAccountDialogOpen}
          onCreate={onCreateAccount}
          onCreated={(account) => {
            if (accountDialogTarget === "from") {
              setFromAccountId(account.id);
            } else {
              setToAccountId(account.id);
            }
          }}
        />
      )}
    </>
  );
}
