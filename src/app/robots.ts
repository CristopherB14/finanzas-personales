import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/transacciones", "/cuentas", "/presupuesto", "/inversiones", "/transferencias", "/flujo-de-caja", "/integraciones"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
