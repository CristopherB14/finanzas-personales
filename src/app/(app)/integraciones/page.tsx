"use client";

import { Suspense } from "react";
import { GoogleCalendarConnect } from "@/components/google-calendar/google-calendar-connect";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingState } from "@/components/ui/loading-state";

function IntegracionesContent() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Integraciones"
        description="Conectá servicios externos para enriquecer tu experiencia."
      />
      <GoogleCalendarConnect />
    </div>
  );
}

export default function IntegracionesPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando integraciones…" />}>
      <IntegracionesContent />
    </Suspense>
  );
}
