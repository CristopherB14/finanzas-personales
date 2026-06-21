"use client";

import Link from "next/link";
import { Repeat, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";

const transactionTypes = [
  {
    href: ROUTES.newIncome,
    label: "Ingreso",
    description: "Registrar un ingreso puntual",
    icon: TrendingUp,
  },
  {
    href: ROUTES.newExpense,
    label: "Gasto",
    description: "Registrar un gasto puntual",
    icon: TrendingDown,
  },
  {
    href: ROUTES.newRecurring,
    label: "Gasto recurrente",
    description: "Programar un gasto periódico",
    icon: Repeat,
  },
];

export default function NuevaTransaccionPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Paso 1 de 2</p>
        <h1 className="text-2xl font-bold">Nueva transacción</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí el tipo de movimiento que querés registrar.
        </p>
      </header>

      <div className="space-y-3">
        {transactionTypes.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href} className="block">
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="flex items-center gap-4 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Button asChild variant="outline" className="w-full">
        <Link href={ROUTES.transactions}>Cancelar</Link>
      </Button>
    </div>
  );
}
