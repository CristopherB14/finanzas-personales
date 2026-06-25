import type { CalendarEventInput } from "@/lib/google-calendar/events";

export interface SyncCalendarEventParams extends CalendarEventInput {
  client_id?: string;
}

export async function syncToGoogleCalendar(
  params: SyncCalendarEventParams
): Promise<{ google_event_id: string } | null> {
  if (!navigator.onLine) return null;

  const response = await fetch("/api/google-calendar/create-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transaction: {
        title: params.title,
        description: params.description,
        amount: params.amount,
        currency: params.currency,
        date: params.date,
        type: params.type,
        recurrence: params.recurrence,
      },
      client_id: params.client_id,
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error ?? "No se pudo sincronizar con Google Calendar");
  }

  return (await response.json()) as { google_event_id: string };
}

export function getTransactionTitle(
  categories: { id: string; name: string; parent_id: string | null }[],
  subcategoryId: string,
  description?: string
): string {
  if (description?.trim()) return description.trim();

  const sub = categories.find((c) => c.id === subcategoryId);
  const parent = sub?.parent_id
    ? categories.find((c) => c.id === sub.parent_id)
    : null;

  if (sub && parent) return `${parent.name} — ${sub.name}`;
  return sub?.name ?? "Transacción";
}
