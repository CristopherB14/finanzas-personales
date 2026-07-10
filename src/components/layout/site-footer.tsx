import Link from "next/link";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { BrandLogo } from "@/components/layout/brand-logo";
import { mutedText } from "@/lib/a11y";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <BrandLogo href="/" size="sm" />
          <p className={mutedText}>{BRAND_TAGLINE}</p>
        </div>
        <nav
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
          aria-label="Enlaces del sitio"
        >
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            Ingresar
          </Link>
          <Link href="/registro" className="text-muted-foreground hover:text-foreground">
            Crear cuenta
          </Link>
        </nav>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        © {year} {BRAND_NAME}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
