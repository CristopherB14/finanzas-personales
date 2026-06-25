import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
      : "";
  } catch {
    return "";
  }
})();

const connectSrc = ["'self'"];
if (supabaseHost) {
  connectSrc.push(`https://${supabaseHost}`, `wss://${supabaseHost}`);
}

// Static-rendering-compatible CSP. Inline scripts emitted by the Next.js app
// shell are statically prerendered without a per-request nonce, so 'unsafe-inline'
// is required on script-src. The remaining directives still mitigate clickjacking,
// base-tag/form hijacking, plugin abuse and cross-origin data exfiltration.
const cspDirectives = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' blob: data:`,
  `font-src 'self'`,
  `connect-src ${connectSrc.join(" ")}`,
  `worker-src 'self'`,
  `manifest-src 'self'`,
  `frame-src 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  ...(isDev ? [] : [`upgrade-insecure-requests`]),
];

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspDirectives.join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/gastos",
        destination: "/transacciones?tipo=expense",
        permanent: false,
      },
      {
        source: "/ingresos",
        destination: "/transacciones?tipo=income",
        permanent: false,
      },
      {
        source: "/gastos-recurrentes",
        destination: "/transacciones?tipo=recurring",
        permanent: false,
      },
      {
        source: "/gastos/nuevo",
        destination: "/transacciones/nuevo/gasto",
        permanent: false,
      },
      {
        source: "/ingresos/nuevo",
        destination: "/transacciones/nuevo/ingreso",
        permanent: false,
      },
      {
        source: "/gastos-recurrentes/nuevo",
        destination: "/transacciones/nuevo/recurrente",
        permanent: false,
      },
      {
        source: "/gastos/:clientId/editar",
        destination: "/transacciones/:clientId/editar",
        permanent: false,
      },
      {
        source: "/ingresos/:clientId/editar",
        destination: "/transacciones/:clientId/editar",
        permanent: false,
      },
      {
        source: "/gastos-recurrentes/:id/editar",
        destination: "/transacciones/recurrentes/:id/editar",
        permanent: false,
      },
      {
        source: "/categorias",
        destination: "/transacciones",
        permanent: false,
      },
      {
        source: "/categorias/nueva",
        destination: "/transacciones/nuevo",
        permanent: false,
      },
      {
        source: "/categorias/:id/editar",
        destination: "/transacciones",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
