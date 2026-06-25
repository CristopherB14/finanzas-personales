"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGoogleCalendar } from "@/hooks/use-google-calendar";
import { errorText } from "@/lib/a11y";

const GOOGLE_OAUTH_ERROR_MESSAGES: Record<string, string> = {
  token_exchange_failed:
    "No se pudo intercambiar el código de autorización con Google. Revisá GOOGLE_REDIRECT_URI y las credenciales OAuth.",
  token_storage_failed:
    "Google autorizó la conexión, pero no se pudieron guardar los tokens. Revisá SUPABASE_SERVICE_ROLE_KEY.",
  storage_not_configured:
    "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor. Agregala en .env.local para guardar los tokens de Google.",
  invalid_state: "La sesión OAuth expiró o es inválida. Intentá conectar de nuevo.",
  missing_code: "Google no devolvió un código de autorización.",
  access_denied: "Acceso denegado en Google.",
};

export function GoogleCalendarConnect() {
  const { connected, calendarId, loading, connect, disconnect } =
    useGoogleCalendar();
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const googleStatus = searchParams.get("google");
    const googleMessage = searchParams.get("message");

    if (googleStatus === "connected") {
      setMessage("Google Calendar conectado correctamente.");
    } else if (googleStatus === "error") {
      const code = googleMessage ? decodeURIComponent(googleMessage) : null;
      setError(
        (code && GOOGLE_OAUTH_ERROR_MESSAGES[code]) ??
          code ??
          "Error al conectar Google Calendar."
      );
    }
  }, [searchParams]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      await disconnect();
      setMessage("Google Calendar desconectado.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo desconectar."
      );
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando conexión…
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Calendar className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h2 className="font-semibold">Google Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Sincronizá ingresos, gastos y gastos recurrentes como eventos en tu
            calendario. Google Calendar es solo una capa de sincronización; tus
            transacciones siguen guardadas acá.
          </p>
        </div>
      </div>

      {connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            Conectado
            {calendarId && calendarId !== "primary" && (
              <span className="text-muted-foreground">({calendarId})</span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? "Desconectando…" : "Desconectar"}
          </Button>
        </div>
      ) : (
        <Button type="button" onClick={connect}>
          Conectar Google Calendar
        </Button>
      )}

      {message && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
      )}
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
