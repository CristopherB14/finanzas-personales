import Link from "next/link";
import {
  Smartphone,
  WifiOff,
  BarChart3,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SiteFooter } from "@/components/layout/site-footer";
import { BRAND_NAME, BRAND_TAGLINE, getSiteUrl } from "@/lib/brand";

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
  const siteUrl = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: BRAND_NAME,
    description: BRAND_TAGLINE,
    url: siteUrl,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50/80 via-background to-background dark:from-slate-950 dark:via-background dark:to-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-5 md:py-6">
        <BrandLogo href="/" size="md" />
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/login">Ingresar</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/registro">Crear cuenta</Link>
          </Button>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-6 text-center md:pt-14 md:text-left"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
          Finanzas personales, sin complicaciones
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
          Tu economía personal,
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {BRAND_TAGLINE.toLowerCase()}
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:mx-0 md:text-lg">
          Dejá la planilla Excel. Con {BRAND_NAME} controlás ingresos, gastos,
          presupuesto y fondo de emergencia con respuestas en lenguaje claro.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
          <Button size="lg" asChild>
            <Link href="/registro">Empezar gratis</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Ya tengo cuenta</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 sm:gap-6">
          {features.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-border/80 bg-card p-6 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
