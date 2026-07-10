"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PiggyBank,
  Plus,
  Wallet,
  ArrowLeftRight,
  Activity,
  LogOut,
  LineChart,
  ArrowRightLeft,
  Plug,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/constants/routes";
import { BrandLogo } from "@/components/layout/brand-logo";
import { UserAccountIndicator } from "@/components/layout/user-account-indicator";
import {
  ghostActionButton,
  mobileNavLink,
  navLink,
  primaryActionLink,
} from "@/lib/a11y";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: ROUTES.transactions, label: "Transacciones", icon: ArrowRightLeft },
  { href: ROUTES.newTransaction, label: "Agregar", icon: Plus, highlight: true },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/presupuesto", label: "Presupuesto", icon: PiggyBank },
];

const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.transactions, label: "Transacciones", icon: ArrowRightLeft },
  { href: "/inversiones", label: "Inversiones", icon: LineChart },
  { href: "/transferencias", label: "Transferencias", icon: ArrowLeftRight },
  { href: "/flujo-de-caja", label: "Flujo de caja", icon: Activity },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/presupuesto", label: "Presupuesto", icon: PiggyBank },
  { href: ROUTES.integrations, label: "Integraciones", icon: Plug },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === ROUTES.transactions) {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname.startsWith("/gastos") ||
      pathname.startsWith("/ingresos") ||
      pathname.startsWith("/gastos-recurrentes")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <>
      <aside className="hidden h-dvh w-60 shrink-0 overflow-hidden border-r border-border bg-card md:block">
        <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth">
          <div className="flex shrink-0 justify-center px-4 pb-5 pt-6">
            <BrandLogo href="/dashboard" size="md" />
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 pb-6">
            <UserAccountIndicator variant="sidebar" className="mb-6" />

            <nav
              className="flex flex-col gap-1"
              aria-label="Navegación principal"
            >
              {sidebarItems.map(({ href, label, icon: Icon }) => {
                const active = isNavActive(pathname, href);

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={navLink(active)}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-1.5 border-t border-border pt-5">
              <Link href={ROUTES.newTransaction} className={primaryActionLink}>
                <Plus className="h-4 w-4" aria-hidden />
                Nueva transacción
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className={ghostActionButton}
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </aside>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden"
        aria-label="Navegación móvil"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          {navItems.map(({ href, label, icon: Icon, highlight }) => {
            const active = isNavActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={highlight ? label : undefined}
                className={cn(
                  "flex min-h-11 min-w-11 flex-1",
                  mobileNavLink(active, highlight)
                )}
              >
                <Icon className={cn("h-5 w-5", highlight && "h-6 w-6")} aria-hidden />
                {!highlight && <span>{label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div
      role="status"
      className="bg-warning px-4 py-2.5 text-center text-sm font-medium text-warning-foreground"
    >
      Sin conexión — tus cambios se guardan en este dispositivo
    </div>
  );
}
