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
  green: "text-success",
  yellow: "text-warning",
  red: "text-destructive",
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
          "border-primary/20 bg-gradient-to-br from-primary/5 to-card dark:border-primary/30 dark:from-primary/10"
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
