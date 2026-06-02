import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TrafficLight } from "@/lib/finance/calculations";

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  variant?: "default" | "hero";
  traffic?: TrafficLight;
}

const trafficColors: Record<TrafficLight, string> = {
  green: "text-emerald-600",
  yellow: "text-amber-600",
  red: "text-red-600",
};

export function MetricCard({
  label,
  value,
  subtext,
  variant = "default",
  traffic,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        variant === "hero" && "border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900"
      )}
    >
      <CardContent className={cn("p-4", variant === "hero" && "p-6")}>
        <p className="text-sm text-slate-500">{label}</p>
        <p
          className={cn(
            "mt-1 font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50",
            variant === "hero" ? "text-3xl" : "text-xl",
            traffic && trafficColors[traffic]
          )}
        >
          {value}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-slate-500">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}
