"use client";

import { Label } from "@/components/ui/label";
import { choicePill } from "@/lib/a11y";

interface SyncToGoogleCalendarFieldProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SyncToGoogleCalendarField({
  value,
  onChange,
  disabled,
}: SyncToGoogleCalendarFieldProps) {
  return (
    <div className="space-y-2">
      <Label>Sincronizar con Google Calendar</Label>
      <p className="text-xs text-muted-foreground">
        Crear un evento en tu calendario al guardar este movimiento.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className={choicePill(value)}
          onClick={() => onChange(true)}
          disabled={disabled}
        >
          Sí
        </button>
        <button
          type="button"
          className={choicePill(!value)}
          onClick={() => onChange(false)}
          disabled={disabled}
        >
          No
        </button>
      </div>
    </div>
  );
}
