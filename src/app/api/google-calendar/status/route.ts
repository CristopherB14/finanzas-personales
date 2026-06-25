import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserGoogleIntegration } from "@/lib/google-calendar/tokens";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const integration = await getUserGoogleIntegration(user.id);

    return NextResponse.json({
      connected: Boolean(integration),
      calendar_id: integration?.calendar_id ?? null,
    });
  } catch (err) {
    // Fail closed: if the token store is misconfigured/unreachable, report the
    // integration as disconnected rather than leaking internal error detail.
    console.error("Google Calendar status check failed", err);
    return NextResponse.json({ connected: false, calendar_id: null });
  }
}
