import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: `Registrate gratis en ${BRAND_NAME} y empezá a controlar tus ingresos, gastos y presupuesto.`,
  robots: { index: true, follow: true },
};

export default function RegistroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
