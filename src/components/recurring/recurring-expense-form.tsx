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
import { parseMoneyInput } from "@/lib/format";
import {
  CUSTOM_UNIT_OPTIONS,
  FREQUENCY_OPTIONS,
  inferCustomInterval,
  inferCustomUnit,
} from "@/lib/recurrence/engine";
import type { RecurringExpenseInput } from "@/lib/data/recurring-expenses";
import {
  choiceCard,
  choicePill,
  emptyPanel,
  errorText,
  inlineAction,
  selectField,
} from "@/lib/a11y";
import { cn } from "@/lib/utils";
import type {
  Account,
  AccountType,
  Category,
  CategoryType,
  RecurringExpense,
} from "@/types/database";
import type { RecurrenceFrequency, RecurrenceUnit } from "@/types/recurrence";

interface RecurringExpenseFormProps {
  mode: "create" | "edit";
  accounts: Account[];
  categories: Category[];
  allCategories: Category[];
  getSubcategoriesFor: (parentId: string) => Category[];
  currency: string;
  initial?: RecurringExpense;
  onSubmit: (data: RecurringExpenseInput) => Promise<void | RecurringExpense>;
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

function ToggleField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className={choicePill(value)}
          onClick={() => onChange(true)}
        >
          Sí
        </button>
        <button
          type="button"
          className={choicePill(!value)}
          onClick={() => onChange(false)}
        >
          No
        </button>
      </div>
    </div>
  );
}

export function RecurringExpenseForm({
  mode,
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
  onDelete,
  deleteError,
}: RecurringExpenseFormProps) {
  const router = useRouter();
  const initialSelection = useMemo(
    () =>
      resolveTransactionCategorySelection(allCategories, initial?.category_id),
    [allCategories, initial?.category_id]
  );

  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(() =>
    initial ? formatAmountInput(initial.amount_cents) : ""
  );
  const [parentCategoryId, setParentCategoryId] = useState(
    () => initialSelection.parentId || categories[0]?.id || ""
  );
  const [subcategoryId, setSubcategoryId] = useState(
    () => initialSelection.subcategoryId
  );
  const [accountId, setAccountId] = useState(
    () => initial?.account_id ?? accounts[0]?.id ?? ""
  );
  const [startDate, setStartDate] = useState(
    () => initial?.start_date ?? format(new Date(), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    () => initial?.frequency ?? "monthly"
  );
  const [customInterval, setCustomInterval] = useState(() =>
    initial ? inferCustomInterval(initial.recurrence_rule) : 1
  );
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>(() =>
    initial ? inferCustomUnit(initial.recurrence_rule) : "months"
  );
  const [nextDueDate, setNextDueDate] = useState(
    () => initial?.next_due_date ?? startDate
  );
  const [autoCreate, setAutoCreate] = useState(
    () => initial?.auto_create ?? false
  );
  const [reminderEnabled, setReminderEnabled] = useState(
    () => initial?.reminder_enabled ?? true
  );
  const [isActive, setIsActive] = useState(() => initial?.is_active ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const title =
    mode === "create" ? "Nuevo gasto recurrente" : "Editar gasto recurrente";

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
    if (!name.trim()) {
      setError("Ingresá un nombre.");
      return;
    }
    if (!accountId) {
      setError("Seleccioná o creá una cuenta.");
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
    if (!startDate) {
      setError("Ingresá una fecha de inicio.");
      return;
    }
    if (!nextDueDate) {
      setError("Ingresá la próxima fecha de vencimiento.");
      return;
    }
    if (endDate && endDate < startDate) {
      setError("La fecha de fin no puede ser anterior al inicio.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        amount_cents: cents,
        category_id: subcategoryId,
        account_id: accountId,
        currency_code: currency,
        start_date: startDate,
        end_date: endDate || null,
        frequency,
        custom_interval: customInterval,
        custom_unit: customUnit,
        next_due_date: nextDueDate,
        auto_create: autoCreate,
        reminder_enabled: reminderEnabled,
        notes: notes.trim() || null,
        is_active: isActive,
      });
      router.push(ROUTES.transactions);
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
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Alquiler, Netflix, Seguro"
            autoFocus
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Monto</Label>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="$ 0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-2xl font-semibold"
            required
          />
        </div>

        <CategoryFieldGroup
          categoryType="expense"
          categories={categories}
          getSubcategoriesFor={getSubcategoriesFor}
          parentCategoryId={parentCategoryId}
          subcategoryId={subcategoryId}
          onParentChange={handleParentCategoryChange}
          onSubcategoryChange={setSubcategoryId}
          categoryKindLabel="gasto"
          onCreateCategory={onCreateCategory}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          onCreateSubcategory={onCreateSubcategory}
          onEditSubcategory={onEditSubcategory}
          onDeleteSubcategory={onDeleteSubcategory}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Cuenta origen</Label>
            {onCreateAccount && (
              <InlineCreateButton
                label="Nueva"
                onClick={() => setAccountDialogOpen(true)}
              />
            )}
          </div>
          {accounts.length === 0 ? (
            <p className={emptyPanel}>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha de inicio</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Fecha de fin (opcional)</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Frecuencia</Label>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFrequency(opt.value)}
                className={choicePill(frequency === opt.value, true)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {frequency === "custom" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customInterval">Cada</Label>
              <Input
                id="customInterval"
                type="number"
                min={1}
                value={customInterval}
                onChange={(e) =>
                  setCustomInterval(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customUnit">Unidad</Label>
              <select
                id="customUnit"
                value={customUnit}
                onChange={(e) =>
                  setCustomUnit(e.target.value as RecurrenceUnit)
                }
                className={selectField}
              >
                {CUSTOM_UNIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="nextDueDate">Próximo vencimiento</Label>
          <Input
            id="nextDueDate"
            type="date"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
            required
          />
        </div>

        <ToggleField
          label="Crear transacción automáticamente"
          description="Si está activo, se genera el gasto en la fecha de vencimiento."
          value={autoCreate}
          onChange={setAutoCreate}
        />

        <ToggleField
          label="Recordatorio"
          description="Mostrar aviso cuando el gasto esté por vencer o vencido."
          value={reminderEnabled}
          onChange={setReminderEnabled}
        />

        <ToggleField
          label="Activo"
          description="Los gastos inactivos no generan transacciones ni recordatorios."
          value={isActive}
          onChange={setIsActive}
        />

        <div className="space-y-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalles adicionales"
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
            {deleteError && <p className={errorText}>{deleteError}</p>}
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Eliminando…" : "Eliminar gasto recurrente"}
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
