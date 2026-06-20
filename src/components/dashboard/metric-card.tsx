import { Card, CardContent } from "@/components/ui/card";
import { mutedText, metaText } from "@/lib/a11y";
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
  green: "text-emerald-700 dark:text-emerald-400",
  yellow: "text-amber-700 dark:text-amber-400",
  red: "text-red-700 dark:text-red-400",
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
        variant === "hero" &&
          "border-emerald-300/60 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-800 dark:from-emerald-950/30 dark:to-card"
      )}
    >
      <CardContent className={cn("p-4", variant === "hero" && "p-6")}>
        <p className={cn("text-sm", mutedText)}>{label}</p>
        <p
          className={cn(
            "mt-1 font-semibold tabular-nums tracking-tight text-foreground",
            variant === "hero" ? "text-3xl" : "text-xl",
            traffic && trafficColors[traffic]
          )}
        >
          {value}
        </p>
        {subtext && <p className={cn("mt-1", metaText)}>{subtext}</p>}
      </CardContent>
    </Card>
  );
}
