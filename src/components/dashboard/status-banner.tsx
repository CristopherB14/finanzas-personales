import type { TrafficLight } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils";

const styles: Record<TrafficLight, string> = {
  green:
    "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800",
  yellow:
    "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800",
  red:
    "bg-red-50 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-100 dark:border-red-800",
};

const dots: Record<TrafficLight, string> = {
  green: "🟢",
  yellow: "🟡",
  red: "🔴",
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
        "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium",
        styles[status]
      )}
    >
      <span aria-hidden>{dots[status]}</span>
      <span>{message}</span>
    </div>
  );
}
