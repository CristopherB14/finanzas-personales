"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountIcon } from "@/components/accounts/account-icon";
import { ACCOUNT_TYPE_OPTIONS } from "@/constants/accounts";
import type { Account, AccountType } from "@/types/database";
import { choiceCard, errorText } from "@/lib/a11y";

interface AccountFormProps {
  mode: "create" | "edit";
  variant?: "page" | "embedded";
  initial?: Account;
  onSubmit: (data: {
    name: string;
    description?: string;
    type: AccountType;
    icon?: string;
    color?: string;
  }) => Promise<void>;
  onSuccess?: () => void;
  onCancel?: () => void;
  onDelete?: () => Promise<void>;
  deleteError?: string | null;
}

export function AccountForm({
  mode,
  variant = "page",
  initial,
  onSubmit,
  onSuccess,
  onCancel,
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
      if (variant === "embedded") {
        onSuccess?.();
      } else {
        router.push("/cuentas");
        router.refresh();
      }
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
    <form
      onSubmit={handleSubmit}
      className={
        variant === "embedded"
          ? "min-w-0 space-y-5"
          : "mx-auto min-w-0 w-full max-w-lg space-y-5"
      }
    >
      {variant === "page" && <h1 className="text-2xl font-bold">{title}</h1>}

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
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          {ACCOUNT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => setType(option.type)}
              className={choiceCard(type === option.type)}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${option.color}20`, color: option.color }}
              >
                <AccountIcon icon={option.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 break-words">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={variant === "embedded" ? "flex gap-2" : undefined}>
        {variant === "embedded" && onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            size="lg"
            disabled={saving}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          className={variant === "embedded" ? "flex-1" : "w-full"}
          size="lg"
          disabled={saving}
        >
          {saving
            ? "Guardando…"
            : mode === "create"
              ? "Crear cuenta"
              : "Guardar cambios"}
        </Button>
      </div>

      {variant === "page" && mode === "edit" && onDelete && (
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
            {deleting ? "Eliminando…" : "Eliminar cuenta"}
          </Button>
        </div>
      )}
    </form>
  );
}
