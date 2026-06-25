import type { RecurrenceRule } from "@/types/recurrence";

/** Build a Google Calendar RRULE string from a recurrence rule or preset string. */
export function toGoogleRecurrence(
  recurrence?: string | RecurrenceRule | null
): string[] | undefined {
  if (!recurrence) return undefined;

  if (typeof recurrence === "string") {
    const rule = recurrence.startsWith("RRULE:")
      ? recurrence
      : `RRULE:${recurrence}`;
    return [rule];
  }

  const parts = [`FREQ=${recurrence.freq}`, `INTERVAL=${recurrence.interval}`];
  if (recurrence.until) {
    const until = recurrence.until.replace(/-/g, "");
    parts.push(`UNTIL=${until}`);
  }

  return [`RRULE:${parts.join(";")}`];
}

/** All-day events use an exclusive end date in Google Calendar. */
export function allDayEventDates(date: string): { start: string; end: string } {
  const start = new Date(`${date}T00:00:00`);
  start.setDate(start.getDate() + 1);
  const end = start.toISOString().slice(0, 10);
  return { start: date, end };
}
