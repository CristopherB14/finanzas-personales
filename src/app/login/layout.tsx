import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Ingresar",
  description: `Accedé a tu cuenta de ${BRAND_NAME} para gestionar tus finanzas personales.`,
  robots: { index: false, follow: true },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
