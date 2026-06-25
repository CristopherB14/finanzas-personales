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
import { CategoryFieldGroup } from "@/components/transactions/category-field-group";
import { ROUTES } from "@/constants/routes";
import { resolveTransactionCategorySelection } from "@/lib/categories/helpers";
import { isCashAccountType } from "@/lib/data/accounts";
import { parseMoneyInput } from "@/lib/format";
import {
  choiceCard,
  emptyPanel,
  errorText,
  inlineAction,
} from "@/lib/a11y";
import { cn } from "@/lib/utils";
import { SyncToGoogleCalendarField } from "@/components/google-calendar/sync-to-google-calendar-field";
import {
  getTransactionTitle,
  syncToGoogleCalendar,
} from "@/lib/google-calendar/sync";
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
  type: "income" | "expense" | "investment";
  accounts: Account[];
  categories: Category[];
  allCategories: Category[];
  getSubcategoriesFor: (parentId: string) => Category[];
  currency: string;
  initial?: LocalTransaction;
  onSubmit: (data: TransactionInput) => Promise<void | LocalTransaction>;
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
  onCreateSubcategory?: (
    parentId: string,
    data: { name: string; icon?: string; color?: string }
  ) => Promise<Category>;
  onEditCategory?: (
    categoryId: string,
    data: { name: string; icon?: string; color?: string }
  ) => Promise<Category>;
  onDeleteCategory?: (
    categoryId: string
  ) => Promise<
    { ok: true } | { ok: false; reason: "has_transactions" | "has_subcategories" }
  >;
  onEditSubcategory?: (
    subcategoryId: string,
    data: { name: string; icon?: string; color?: string }
  ) => Promise<Category>;
  onDeleteSubcategory?: (
    subcategoryId: string
  ) => Promise<{ ok: true } | { ok: false; reason: "has_transactions" }>;
  listPath?: string;
  googleCalendarConnected?: boolean;
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

export function TransactionForm({
  mode,
  type,
  accounts,
  categories,
  allCategories,
  getSubcategoriesFor,
  currency,
  initial,
  onSubmit,
  onCreateAccount,
  onCreateCategory,
  onCreateSubcategory,
  onEditCategory,
  onDeleteCategory,
  onEditSubcategory,
  onDeleteSubcategory,
  listPath,
  googleCalendarConnected = false,
  onDelete,
  deleteError,
}: TransactionFormProps) {
  const router = useRouter();
  const initialSelection = useMemo(
    () => resolveTransactionCategorySelection(allCategories, initial?.category_id),
    [allCategories, initial?.category_id]
  );

  const selectableAccounts = useMemo(
    () =>
      type === "investment"
        ? accounts.filter((a) => isCashAccountType(a.type))
        : accounts,
    [accounts, type]
  );

  const [amount, setAmount] = useState(() =>
    initial ? formatAmountInput(initial.amount_cents) : ""
  );
  const [parentCategoryId, setParentCategoryId] = useState(
    () =>
      initialSelection.parentId ||
      categories[0]?.id ||
      ""
  );
  const [subcategoryId, setSubcategoryId] = useState(
    () => initialSelection.subcategoryId
  );
  const [accountId, setAccountId] = useState(
    () => initial?.account_id ?? selectableAccounts[0]?.id ?? ""
  );
  const [date, setDate] = useState(
    () =>
      initial?.transaction_date ?? format(new Date(), "yyyy-MM-dd")
  );
  const [description, setDescription] = useState(
    () => initial?.description ?? ""
  );
  const [syncToGoogleCalendarEnabled, setSyncToGoogleCalendarEnabled] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const title =
    mode === "create"
      ? type === "expense"
        ? "Nuevo gasto"
        : type === "investment"
          ? "Nueva inversión"
          : "Nuevo ingreso"
      : type === "expense"
        ? "Editar gasto"
        : type === "investment"
          ? "Editar inversión"
          : "Editar ingreso";

  const resolvedListPath =
    listPath ??
    (type === "investment"
      ? "/inversiones"
      : ROUTES.transactions);

  const categoryKindLabel =
    type === "expense"
      ? "gasto"
      : type === "investment"
        ? "inversión"
        : "ingreso";

  const handleParentCategoryChange = (categoryId: string) => {
    setParentCategoryId(categoryId);
    setSubcategoryId("");
  };

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
    if (!parentCategoryId) {
      setError("Seleccioná o creá una categoría.");
      return;
    }
    if (!subcategoryId) {
      setError("Seleccioná o creá una subcategoría.");
      return;
    }

    setSaving(true);
    try {
      const tx = await onSubmit({
        account_id: accountId,
        category_id: subcategoryId,
        type,
        amount_cents: cents,
        currency_code: currency,
        transaction_date: date,
        description: description || undefined,
      });

      if (
        mode === "create" &&
        syncToGoogleCalendarEnabled &&
        googleCalendarConnected &&
        (type === "income" || type === "expense")
      ) {
        try {
          await syncToGoogleCalendar({
            title: getTransactionTitle(
              allCategories,
              subcategoryId,
              description
            ),
            description: description || undefined,
            amount: cents,
            currency,
            date,
            type,
            client_id: tx?.client_id,
          });
        } catch (syncError) {
          setError(
            syncError instanceof Error
              ? syncError.message
              : "No se pudo sincronizar con Google Calendar."
          );
          return;
        }
      }

      router.push(resolvedListPath);
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

        <CategoryFieldGroup
          categoryType={type}
          categories={categories}
          getSubcategoriesFor={getSubcategoriesFor}
          parentCategoryId={parentCategoryId}
          subcategoryId={subcategoryId}
          onParentChange={handleParentCategoryChange}
          onSubcategoryChange={setSubcategoryId}
          categoryKindLabel={categoryKindLabel}
          onCreateCategory={onCreateCategory}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          onCreateSubcategory={onCreateSubcategory}
          onEditSubcategory={onEditSubcategory}
          onDeleteSubcategory={onDeleteSubcategory}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="account">
              {type === "investment" ? "Cuenta origen" : "Cuenta"}
            </Label>
            {onCreateAccount && (
              <InlineCreateButton
                label="Nueva"
                onClick={() => setAccountDialogOpen(true)}
              />
            )}
          </div>
          {selectableAccounts.length === 0 ? (
            <p className={emptyPanel}>
              Todavía no tenés cuentas.
              {onCreateAccount
                ? ' Tocá "Nueva" para crear una.'
                : " Creá una desde Cuentas."}
            </p>
          ) : (
            <div className="space-y-2">
              {selectableAccounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccountId(a.id)}
                  className={choiceCard(accountId === a.id)}
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
            placeholder={
              type === "investment" ? "Ej: Compra AAPL" : "Ej: Supermercado"
            }
          />
        </div>

        {mode === "create" &&
          googleCalendarConnected &&
          (type === "income" || type === "expense") && (
            <SyncToGoogleCalendarField
              value={syncToGoogleCalendarEnabled}
              onChange={setSyncToGoogleCalendarEnabled}
            />
          )}

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
    </>
  );
}
