import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGoogleCalendarEvent } from "@/lib/google-calendar/events";
import { getValidAccessToken } from "@/lib/google-calendar/tokens";
import { createEventBodySchema } from "@/lib/google-calendar/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createEventBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  }

  const { transaction, client_id, user_id } = parsed.data;

  // A client must never act on behalf of another user.
  if (user_id && user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const origin = new URL(request.url).origin;

  try {
    const { accessToken, calendarId } = await getValidAccessToken(
      user.id,
      origin
    );
    const event = await createGoogleCalendarEvent(
      accessToken,
      calendarId,
      transaction
    );

    if (client_id) {
      await supabase
        .from("transactions")
        .update({ google_event_id: event.id })
        .eq("user_id", user.id)
        .eq("client_id", client_id);
    }

    return NextResponse.json({ google_event_id: event.id });
  } catch (err) {
    const notConnected =
      err instanceof Error && err.message.includes("not connected");

    // Never leak upstream/internal error detail to the client.
    console.error("Google Calendar create-event failed", err);

    return NextResponse.json(
      {
        error: notConnected
          ? "Google Calendar not connected"
          : "Failed to create calendar event",
      },
      { status: notConnected ? 400 : 502 }
    );
  }
}
