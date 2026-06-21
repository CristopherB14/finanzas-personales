"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  Plus,
  Wallet,
  ArrowLeftRight,
  Activity,
  Tags,
  LogOut,
  LineChart,
  Repeat,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  brandLink,
  ghostActionButton,
  mobileNavLink,
  navLink,
  primaryActionLink,
} from "@/lib/a11y";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/gastos", label: "Gastos", icon: TrendingDown },
  { href: "/gastos/nuevo", label: "Agregar", icon: Plus, highlight: true },
  { href: "/ingresos", label: "Ingresos", icon: TrendingUp },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/presupuesto", label: "Presupuesto", icon: PiggyBank },
];

const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ingresos", label: "Ingresos", icon: TrendingUp },
  { href: "/gastos", label: "Gastos", icon: TrendingDown },
  { href: "/gastos-recurrentes", label: "Recurrentes", icon: Repeat },
  { href: "/inversiones", label: "Inversiones", icon: LineChart },
  { href: "/transferencias", label: "Transferencias", icon: ArrowLeftRight },
  { href: "/flujo-de-caja", label: "Flujo de caja", icon: Activity },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/categorias", label: "Categorías", icon: Tags },
  { href: "/presupuesto", label: "Presupuesto", icon: PiggyBank },
];

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
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card p-4 md:block">
        <Link href="/dashboard" className={cn(brandLink, "mb-8 block px-2 text-lg")}>
          Mis Finanzas
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Navegación principal">
          {sidebarItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + "/");

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={navLink(active)}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <Link href="/gastos/nuevo" className={cn(primaryActionLink, "mt-6")}>
          <Plus className="h-4 w-4" aria-hidden />
          Registrar gasto
        </Link>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className={cn(ghostActionButton, "mt-2")}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Cerrar sesión
        </button>
      </aside>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur md:hidden"
        aria-label="Navegación móvil"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
          {navItems.map(({ href, label, icon: Icon, highlight }) => {
            const active = pathname === href || pathname.startsWith(href + "/");

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={highlight ? label : undefined}
                className={cn(
                  "flex flex-1",
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
      className="bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white"
    >
      Sin conexión — tus cambios se guardan en este dispositivo
    </div>
  );
}
