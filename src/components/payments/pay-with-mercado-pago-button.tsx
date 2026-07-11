"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  startMercadoPagoCheckout,
  type StartCheckoutInput,
} from "@/lib/payments/client";
import { cn } from "@/lib/utils";

type PayWithMercadoPagoButtonProps = {
  buildPayload: () => StartCheckoutInput | null;
  validate?: () => string | null;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "secondary" | "outline";
  label?: string;
  onError?: (message: string) => void;
};

export function PayWithMercadoPagoButton({
  buildPayload,
  validate,
  disabled,
  className,
  size = "default",
  variant = "secondary",
  label = "Pagar con Mercado Pago",
  onError,
}: PayWithMercadoPagoButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const validationError = validate?.();
    if (validationError) {
      onError?.(validationError);
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      onError?.("Completá los datos del gasto antes de pagar.");
      return;
    }

    setLoading(true);
    try {
      const session = await startMercadoPagoCheckout(payload);
      window.location.assign(session.checkout_url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo iniciar el pago";
      onError?.(message);
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={disabled || loading}
      className={cn(className)}
      onClick={() => void handleClick()}
    >
      {loading ? "Redirigiendo…" : label}
    </Button>
  );
}
