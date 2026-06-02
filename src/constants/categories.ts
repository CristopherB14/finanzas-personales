import type { CategoryType } from "@/types/database";

export const DEFAULT_EXPENSE_CATEGORIES: {
  name: string;
  icon: string;
  color: string;
}[] = [
  { name: "Vivienda", icon: "home", color: "#6366f1" },
  { name: "Alimentación", icon: "utensils", color: "#22c55e" },
  { name: "Transporte", icon: "car", color: "#3b82f6" },
  { name: "Salud", icon: "heart-pulse", color: "#ef4444" },
  { name: "Educación", icon: "graduation-cap", color: "#8b5cf6" },
  { name: "Entretenimiento", icon: "gamepad-2", color: "#f59e0b" },
  { name: "Suscripciones", icon: "repeat", color: "#ec4899" },
  { name: "Servicios", icon: "zap", color: "#14b8a6" },
  { name: "Ropa", icon: "shirt", color: "#a855f7" },
  { name: "Otros", icon: "more-horizontal", color: "#64748b" },
];

export const DEFAULT_INCOME_CATEGORIES: {
  name: string;
  icon: string;
  color: string;
}[] = [
  { name: "Sueldo", icon: "briefcase", color: "#22c55e" },
  { name: "Freelance", icon: "laptop", color: "#3b82f6" },
  { name: "Negocio", icon: "store", color: "#f59e0b" },
  { name: "Ingresos pasivos", icon: "trending-up", color: "#8b5cf6" },
  { name: "Dividendos", icon: "pie-chart", color: "#06b6d4" },
  { name: "Intereses", icon: "percent", color: "#14b8a6" },
  { name: "Extraordinario", icon: "gift", color: "#ec4899" },
];

export function getDefaultCategories(type: CategoryType) {
  return type === "expense"
    ? DEFAULT_EXPENSE_CATEGORIES
    : DEFAULT_INCOME_CATEGORIES;
}
