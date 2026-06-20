import { AppNav } from "@/components/layout/app-nav";
import { SyncProvider } from "@/components/providers/sync-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SyncProvider>
      <div className="flex min-h-screen min-w-0 bg-background">
        <AppNav />
        <main className="min-w-0 flex-1 overflow-x-clip pb-24 md:pb-0">
          <div className="mx-auto min-w-0 max-w-5xl p-4 md:p-8">{children}</div>
        </main>
      </div>
    </SyncProvider>
  );
}
