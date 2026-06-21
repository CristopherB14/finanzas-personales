"use client";

import { useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useOnline } from "@/hooks/use-online";
import { ensureUserSetup } from "@/lib/data/seed-user";
import { startAutoSync } from "@/lib/sync/sync-engine";
import { OfflineBanner } from "@/components/layout/app-nav";
import { RecurringExpenseProcessor } from "@/components/recurring/recurring-expense-processor";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const online = useOnline();

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    void ensureUserSetup(user.id).finally(() => {
      if (cancelled) return;
    });

    const stopSync = startAutoSync(user.id);

    return () => {
      cancelled = true;
      stopSync();
    };
  }, [user?.id]);

  return (
    <>
      <OfflineBanner online={online} />
      <RecurringExpenseProcessor />
      {children}
    </>
  );
}
