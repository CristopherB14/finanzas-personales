import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteGoogleIntegration } from "@/lib/google-calendar/tokens";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteGoogleIntegration(user.id);
  return NextResponse.json({ disconnected: true });
}
