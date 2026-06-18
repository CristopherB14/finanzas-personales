export const CATEGORY_ICON_OPTIONS = [
  { icon: "home", label: "Hogar", color: "#6366f1" },
  { icon: "utensils", label: "Comida", color: "#22c55e" },
  { icon: "car", label: "Transporte", color: "#3b82f6" },
  { icon: "heart-pulse", label: "Salud", color: "#ef4444" },
  { icon: "graduation-cap", label: "Educación", color: "#8b5cf6" },
  { icon: "gamepad-2", label: "Ocio", color: "#f59e0b" },
  { icon: "repeat", label: "Suscripciones", color: "#ec4899" },
  { icon: "zap", label: "Servicios", color: "#14b8a6" },
  { icon: "shirt", label: "Ropa", color: "#a855f7" },
  { icon: "briefcase", label: "Trabajo", color: "#22c55e" },
  { icon: "laptop", label: "Freelance", color: "#3b82f6" },
  { icon: "store", label: "Negocio", color: "#f59e0b" },
  { icon: "trending-up", label: "Inversión", color: "#8b5cf6" },
  { icon: "pie-chart", label: "Dividendos", color: "#06b6d4" },
  { icon: "percent", label: "Intereses", color: "#14b8a6" },
  { icon: "gift", label: "Regalo", color: "#ec4899" },
  { icon: "more-horizontal", label: "Otros", color: "#64748b" },
] as const;

export function getCategoryIconOption(icon: string | null) {
  return (
    CATEGORY_ICON_OPTIONS.find((o) => o.icon === icon) ??
    CATEGORY_ICON_OPTIONS[CATEGORY_ICON_OPTIONS.length - 1]
  );
}
