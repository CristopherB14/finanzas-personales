import type { TrafficLight } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils";

const styles: Record<TrafficLight, string> = {
  green: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200",
  yellow: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200",
  red: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200",
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
