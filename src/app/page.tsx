import Link from "next/link";
import {
  Smartphone,
  WifiOff,
  BarChart3,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { brandLink } from "@/lib/a11y";

const features = [
  {
    icon: BarChart3,
    title: "Claro en segundos",
    text: "Dashboard con semáforos y gráficos fáciles de entender.",
  },
  {
    icon: WifiOff,
    title: "Funciona sin internet",
    text: "Registrá gastos offline y sincronizá automáticamente después.",
  },
  {
    icon: Smartphone,
    title: "En todos tus dispositivos",
    text: "Web, PWA en celular y escritorio. Sin depender de una tienda.",
  },
  {
    icon: Shield,
    title: "Tus datos, protegidos",
    text: "Autenticación segura y respaldo en la nube.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-slate-50 dark:from-slate-950 dark:to-slate-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <span className={brandLink}>Mis Finanzas</span>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Ingresar</Link>
          </Button>
          <Button asChild>
            <Link href="/registro">Crear cuenta</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 text-center md:pt-16 md:text-left">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
          Tu economía personal,
          <br />
          <span className="text-accent">simple y visual</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground md:mx-0">
          Dejá la planilla Excel. Controlá ingresos, gastos, presupuesto y
          fondo de emergencia con respuestas en lenguaje claro.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
          <Button size="lg" asChild>
            <Link href="/registro">Empezar gratis</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Ya tengo cuenta</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/80 bg-card p-6 text-left shadow-sm"
            >
              <Icon className="h-8 w-8 text-accent" aria-hidden />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
