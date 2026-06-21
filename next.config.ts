import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
