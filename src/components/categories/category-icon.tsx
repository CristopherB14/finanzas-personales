import {
  Briefcase,
  Car,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  MoreHorizontal,
  Percent,
  PieChart,
  Repeat,
  Shirt,
  Store,
  TrendingUp,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  utensils: Utensils,
  car: Car,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "gamepad-2": Gamepad2,
  repeat: Repeat,
  zap: Zap,
  shirt: Shirt,
  briefcase: Briefcase,
  laptop: Laptop,
  store: Store,
  "trending-up": TrendingUp,
  "pie-chart": PieChart,
  percent: Percent,
  gift: Gift,
  "more-horizontal": MoreHorizontal,
};

export function CategoryIcon({
  icon,
  className,
}: {
  icon: string | null;
  className?: string;
}) {
  const Icon = (icon && ICON_MAP[icon]) || MoreHorizontal;
  return <Icon className={className} />;
}
