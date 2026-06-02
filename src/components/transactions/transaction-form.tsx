"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  userId,
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

  useEffect(() => {
    if (accounts[0] && !accountId) setAccountId(accounts[0].id);
    if (categories[0] && !categoryId) setCategoryId(categories[0].id);
  }, [accounts, categories, accountId, categoryId]);

  const title = type === "expense" ? "Nuevo gasto" : "Nuevo ingreso";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseMoneyInput(amount);
    if (cents <= 0) return;

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
        <select
          id="account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
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

      <Button type="submit" className="w-full" size="lg" disabled={saving}>
        {saving ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
