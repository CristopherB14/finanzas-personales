"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountIcon } from "@/components/accounts/account-icon";
import { AccountCreateDialog } from "@/components/transactions/account-create-dialog";
import { CategoryCreateDialog } from "@/components/transactions/category-create-dialog";
import { parseMoneyInput } from "@/lib/format";
import type {
  Account,
  AccountType,
  Category,
  CategoryType,
  LocalTransaction,
} from "@/types/database";
import type { TransactionInput } from "@/hooks/use-transactions";

interface TransactionFormProps {
  mode: "create" | "edit";
  type: "income" | "expense";
  accounts: Account[];
  categories: Category[];
  currency: string;
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
  onCreateCategory?: (data: {
    name: string;
    type: CategoryType;
    icon?: string;
    color?: string;
  }) => Promise<Category>;
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
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1 px-2 text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
      onClick={onClick}
    >
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}

export function TransactionForm({
  mode,
  type,
  accounts,
  categories,
  currency,
  initial,
  onSubmit,
  onCreateAccount,
  onCreateCategory,
  onDelete,
  deleteError,
}: TransactionFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState(() =>
    initial ? formatAmountInput(initial.amount_cents) : ""
  );
  const [categoryId, setCategoryId] = useState(
    () => initial?.category_id ?? categories[0]?.id ?? ""
  );
  const [accountId, setAccountId] = useState(
    () => initial?.account_id ?? accounts[0]?.id ?? ""
  );
  const [date, setDate] = useState(
    () =>
      initial?.transaction_date ?? format(new Date(), "yyyy-MM-dd")
  );
  const [description, setDescription] = useState(
    () => initial?.description ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const title =
    mode === "create"
      ? type === "expense"
        ? "Nuevo gasto"
        : "Nuevo ingreso"
      : type === "expense"
        ? "Editar gasto"
        : "Editar ingreso";

  const listPath = type === "expense" ? "/gastos" : "/ingresos";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cents = parseMoneyInput(amount);
    if (cents <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    if (!accountId) {
      setError("Seleccioná o creá una cuenta.");
      return;
    }
    if (!date) {
      setError("Ingresá una fecha.");
      return;
    }
    if (!categoryId) {
      setError("Seleccioná o creá una categoría.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        account_id: accountId,
        category_id: categoryId || null,
        type,
        amount_cents: cents,
        currency_code: currency,
        transaction_date: date,
        description: description || undefined,
      });
      router.push(listPath);
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

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Categoría</Label>
            {onCreateCategory && (
              <InlineCreateButton
                label="Nueva"
                onClick={() => setCategoryDialogOpen(true)}
              />
            )}
          </div>
          {categories.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 dark:border-slate-700">
              Todavía no tenés categorías de{" "}
              {type === "expense" ? "gasto" : "ingreso"}.
              {onCreateCategory
                ? ' Tocá "Nueva" para crear una.'
                : " Creá una desde Categorías."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    categoryId === c.id
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800"
                  }`}
                  style={
                    categoryId === c.id
                      ? undefined
                      : { borderLeft: `3px solid ${c.color ?? "#64748b"}` }
                  }
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="account">Cuenta</Label>
            {onCreateAccount && (
              <InlineCreateButton
                label="Nueva"
                onClick={() => setAccountDialogOpen(true)}
              />
            )}
          </div>
          {accounts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 dark:border-slate-700">
              Todavía no tenés cuentas.
              {onCreateAccount
                ? ' Tocá "Nueva" para crear una.'
                : " Creá una desde Cuentas."}
            </p>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccountId(a.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    accountId === a.id
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${a.color ?? "#64748b"}20`,
                      color: a.color ?? "#64748b",
                    }}
                  >
                    <AccountIcon icon={a.icon} className="h-4 w-4" />
                  </span>
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Nota (opcional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Supermercado"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

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
              <p className="text-sm text-red-600">{deleteError}</p>
            )}
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Eliminando…" : "Eliminar movimiento"}
            </Button>
          </div>
        )}
      </form>

      {onCreateAccount && (
        <AccountCreateDialog
          open={accountDialogOpen}
          onOpenChange={setAccountDialogOpen}
          onCreate={onCreateAccount}
          onCreated={(account) => setAccountId(account.id)}
        />
      )}

      {onCreateCategory && (
        <CategoryCreateDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          type={type}
          onCreate={onCreateCategory}
          onCreated={(category) => setCategoryId(category.id)}
        />
      )}
    </>
  );
}
