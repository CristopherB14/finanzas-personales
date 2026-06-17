"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountIcon } from "@/components/accounts/account-icon";
import { ACCOUNT_TYPE_OPTIONS } from "@/constants/accounts";
import type { Account, AccountType } from "@/types/database";
import { cn } from "@/lib/utils";

interface AccountFormProps {
  mode: "create" | "edit";
  initial?: Account;
  onSubmit: (data: {
    name: string;
    description?: string;
    type: AccountType;
    icon?: string;
    color?: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  deleteError?: string | null;
}

export function AccountForm({
  mode,
  initial,
  onSubmit,
  onDelete,
  deleteError,
}: AccountFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "other");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const title = mode === "create" ? "Nueva cuenta" : "Editar cuenta";
  const selectedOption = ACCOUNT_TYPE_OPTIONS.find((o) => o.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        icon: selectedOption?.icon,
        color: selectedOption?.color,
      });
      router.push("/cuentas");
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-5">
      <h1 className="text-2xl font-bold">{title}</h1>

      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Mercado Pago"
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Cuenta para gastos del día a día"
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo de cuenta</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACCOUNT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => setType(option.type)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                type === option.type
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
              )}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${option.color}20`, color: option.color }}
              >
                <AccountIcon icon={option.icon} className="h-4 w-4" />
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={saving}>
        {saving ? "Guardando…" : mode === "create" ? "Crear cuenta" : "Guardar cambios"}
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
            {deleting ? "Eliminando…" : "Eliminar cuenta"}
          </Button>
        </div>
      )}
    </form>
  );
}
