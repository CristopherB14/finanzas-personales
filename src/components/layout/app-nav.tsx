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
  Tags,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
  { href: "/flujo-de-caja", label: "Flujo de caja", icon: ArrowLeftRight },
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
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:block">
        <Link href="/dashboard" className="mb-8 block px-2 text-lg font-bold text-emerald-700">
          Mis Finanzas
        </Link>
        <nav className="flex flex-col gap-1">
          {sidebarItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/gastos/nuevo"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Registrar gasto
        </Link>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
          {navItems.map(({ href, label, icon: Icon, highlight }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium",
                highlight &&
                  "-mt-5 flex h-14 w-14 flex-none items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg",
                !highlight &&
                  (pathname === href
                    ? "text-emerald-700"
                    : "text-slate-500")
              )}
            >
              <Icon className={cn("h-5 w-5", highlight && "h-6 w-6")} />
              {!highlight && <span>{label}</span>}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
      Sin conexión — tus cambios se guardan en este dispositivo
    </div>
  );
}
