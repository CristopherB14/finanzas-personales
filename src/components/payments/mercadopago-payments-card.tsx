"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  paymentStatusLabel,
} from "@/lib/payments/client";
import { formatMoney } from "@/lib/format";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type AttemptSummary = {
  id: string;
  status: string;
  amount_cents: number;
  currency_code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  error_message: string | null;
};

export function MercadoPagoPaymentsCard() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/payments/status");
        const data = (await res.json()) as {
          configured?: boolean;
          attempts?: AttemptSummary[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "No se pudo cargar el estado");
          return;
        }
        setConfigured(Boolean(data.configured));
        setAttempts(data.attempts ?? []);
      } catch {
        if (!cancelled) setError("No se pudo cargar Mercado Pago");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold">Mercado Pago</h2>
          <p className="text-sm text-muted-foreground">
            Pagá gastos pendientes con Checkout Pro. El gasto se registra solo
            cuando Mercado Pago confirma el pago.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {!loading && configured === false && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Mercado Pago aún no está configurado en el servidor. Agregá las
            variables de entorno (Access Token y Webhook Secret).
          </p>
        )}

        {!loading && configured && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Integración lista. Usá el botón en un gasto nuevo o en un gasto
            recurrente vencido.
          </p>
        )}

        {attempts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Últimos pagos
            </p>
            <ul className="space-y-2">
              {attempts.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {a.description || "Gasto"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {paymentStatusLabel(a.status)} ·{" "}
                      {format(new Date(a.created_at), "d MMM HH:mm", {
                        locale: es,
                      })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p>{formatMoney(a.amount_cents, a.currency_code)}</p>
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                      <Link href={`/pagos/resultado?attempt_id=${a.id}`}>
                        Ver
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
