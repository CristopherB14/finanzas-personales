import { formatMoney } from "@/lib/format";
import { allDayEventDates, toGoogleRecurrence } from "@/lib/google-calendar/rrule";
import type { RecurrenceRule } from "@/types/recurrence";

export type CalendarTransactionType = "income" | "expense" | "recurring";

export interface CalendarEventInput {
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  date: string;
  type: CalendarTransactionType;
  recurrence?: string | RecurrenceRule;
}

const TYPE_LABELS: Record<CalendarTransactionType, string> = {
  income: "Ingreso",
  expense: "Gasto",
  recurring: "Gasto recurrente",
};

export function buildEventDescription(input: CalendarEventInput): string {
  const typeLabel = TYPE_LABELS[input.type];
  const amountLabel = formatMoney(input.amount, input.currency ?? "ARS");
  const parts = [typeLabel, amountLabel];
  if (input.description?.trim()) {
    parts.push(input.description.trim());
  }
  return parts.join(" · ");
}

export function buildGoogleCalendarEventBody(input: CalendarEventInput) {
  const { start, end } = allDayEventDates(input.date);
  const recurrence = toGoogleRecurrence(input.recurrence);

  return {
    summary: input.title,
    description: buildEventDescription(input),
    start: { date: start },
    end: { date: end },
    ...(recurrence ? { recurrence } : {}),
  };
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  input: CalendarEventInput
): Promise<{ id: string }> {
  const body = buildGoogleCalendarEventBody(input);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Google Calendar API error (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as { id: string };
  return { id: data.id };
}
