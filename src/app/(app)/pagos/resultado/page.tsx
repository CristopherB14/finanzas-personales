"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import {
  fetchPaymentAttemptStatus,
  paymentStatusLabel,
} from "@/lib/payments/client";
import { formatMoney } from "@/lib/format";
import { syncAll } from "@/lib/sync/sync-engine";
import { useUser } from "@/hooks/use-user";

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const attemptId = searchParams.get("attempt_id");
  const returnStatus = searchParams.get("status");
  const paymentId =
    searchParams.get("payment_id") ?? searchParams.get("collection_id");

  const canPoll = Boolean(attemptId && user);

  const [status, setStatus] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [currency, setCurrency] = useState("ARS");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(canPoll);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId || !user) return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const data = await fetchPaymentAttemptStatus(
          attemptId,
          paymentId && paymentId !== "null" ? paymentId : null
        );
        if (cancelled) return;
        setStatus(data.status);
        setDescription(data.description);
        setAmountCents(data.amount_cents);
        setCurrency(data.currency_code);
        setErrorMessage(data.error_message);
        setPollError(null);

        if (data.status === "approved") {
          void syncAll(user.id).catch(() => {
            /* sync will retry via SyncProvider */
          });
          setLoading(false);
          return;
        }

        if (
          data.status === "rejected" ||
          data.status === "cancelled" ||
          data.status === "refunded"
        ) {
          setLoading(false);
          return;
        }

        attempts += 1;
        if (attempts < 8) {
          timer = setTimeout(() => void poll(), 2000);
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        setPollError(
          err instanceof Error ? err.message : "Error al consultar el pago"
        );
        setLoading(false);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attemptId, paymentId, user]);

  if (!attemptId) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <PageHeader
          title="Resultado del pago"
          description="No encontramos la referencia del pago."
        />
        <Button asChild>
          <Link href="/gastos">Volver a gastos</Link>
        </Button>
      </div>
    );
  }

  const effectiveStatus = status ?? returnStatus ?? "pending";
  const isApproved = status === "approved";
  const isFailed =
    status === "rejected" ||
    status === "cancelled" ||
    returnStatus === "failure";
  const isPending = !isApproved && !isFailed;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Resultado del pago"
        description="Confirmación de Mercado Pago"
      />

      <Card>
        <CardContent className="space-y-3 p-5">
          {loading && isPending && (
            <p className="text-sm text-muted-foreground">
              Confirmando el pago con Mercado Pago…
            </p>
          )}

          <p className="text-lg font-semibold">
            {isApproved
              ? "Pago confirmado"
              : isFailed
                ? "El pago no se completó"
                : "Pendiente de confirmación"}
          </p>

          <p className="text-sm text-muted-foreground">
            Estado: {paymentStatusLabel(effectiveStatus)}
          </p>

          {description && (
            <p className="text-sm">
              <span className="text-muted-foreground">Concepto: </span>
              {description}
            </p>
          )}

          {amountCents != null && (
            <p className="text-sm">
              <span className="text-muted-foreground">Monto: </span>
              {formatMoney(amountCents, currency)}
            </p>
          )}

          {(errorMessage || pollError) && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorMessage || pollError}
            </p>
          )}

          {isApproved && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              El gasto se registró automáticamente. Saldos, presupuestos e
              informes se actualizarán al sincronizar.
            </p>
          )}

          {isPending && !loading && (
            <p className="text-sm text-muted-foreground">
              Si ya pagaste, la confirmación puede demorar unos segundos. Podés
              volver más tarde; el webhook actualizará el gasto solo.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/gastos">Ver gastos</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Ir al dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

export default function PagosResultadoPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando resultado…" />}>
      <PaymentResultContent />
    </Suspense>
  );
}
