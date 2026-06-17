"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountIcon } from "@/components/accounts/account-icon";
import { parseMoneyInput } from "@/lib/format";
import type { Account, Category, TransactionType } from "@/types/database";

interface TransactionFormProps {
  type: TransactionType;
  userId: string;
  accounts: Account[];
  categories: Category[];
  currency: string;
  onSubmit: (data: {
    account_id: string;
    category_id: string | null;
    type: TransactionType;
    amount_cents: number;
    currency_code: string;
    transaction_date: string;
    description?: string;
  }) => Promise<void>;
}

export function TransactionForm({
  type,
  userId: _userId,
  accounts,
  categories,
  currency,
  onSubmit,
}: TransactionFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accounts[0] && !accountId) setAccountId(accounts[0].id);
    if (categories[0] && !categoryId) setCategoryId(categories[0].id);
  }, [accounts, categories, accountId, categoryId]);

  const title = type === "expense" ? "Nuevo gasto" : "Nuevo ingreso";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cents = parseMoneyInput(amount);
    if (cents <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    if (!accountId) {
      setError("Seleccioná una cuenta.");
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
      router.push(type === "expense" ? "/gastos" : "/ingresos");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-5">
      <h1 className="text-2xl font-bold">{title}</h1>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <p className="text-slate-600">
            Necesitás al menos una cuenta para registrar un movimiento.
          </p>
          <Button asChild className="mt-4">
            <Link href="/cuentas/nueva">Crear cuenta</Link>
          </Button>
        </div>
      ) : (
        <>
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
        <Label>Categoría</Label>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="account">Cuenta</Label>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Fecha</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
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
        {saving ? "Guardando…" : "Guardar"}
      </Button>
        </>
      )}
    </form>
  );
}
