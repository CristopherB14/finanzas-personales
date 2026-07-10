import type { TrafficLight } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils";

const styles: Record<TrafficLight, string> = {
  green:
    "bg-success/10 text-success border-success/30 dark:bg-success/15 dark:border-success/40",
  yellow:
    "bg-warning/10 text-warning border-warning/30 dark:bg-warning/15 dark:border-warning/40",
  red:
    "bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/15 dark:border-destructive/40",
};

const labels: Record<TrafficLight, string> = {
  green: "Estado favorable",
  yellow: "Atención",
  red: "Alerta",
};

export function StatusBanner({
  status,
  message,
}: {
  status: TrafficLight;
  message: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
        styles[status]
      )}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-current"
        aria-hidden
      />
      <span>
        <span className="sr-only">{labels[status]}: </span>
        {message}
      </span>
    </div>
  );
}
