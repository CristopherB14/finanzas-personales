"use client";

import { Suspense } from "react";
import { GoogleCalendarConnect } from "@/components/google-calendar/google-calendar-connect";

function IntegracionesContent() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integraciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conectá servicios externos para enriquecer tu experiencia.
        </p>
      </div>
      <GoogleCalendarConnect />
    </div>
  );
}

export default function IntegracionesPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
      <IntegracionesContent />
    </Suspense>
  );
}
