import { AppNav } from "@/components/layout/app-nav";
import { AppMobileHeader } from "@/components/layout/user-account-indicator";
import { SyncProvider } from "@/components/providers/sync-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SyncProvider>
      <div className="flex h-dvh min-w-0 overflow-hidden bg-background">
        <AppNav />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AppMobileHeader />
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-clip overscroll-y-contain scroll-smooth pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
            <div className="mx-auto min-w-0 max-w-5xl p-4 md:p-8">{children}</div>
          </main>
        </div>
      </div>
    </SyncProvider>
  );
}
