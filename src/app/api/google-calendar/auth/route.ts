import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildGoogleAuthUrl,
  GOOGLE_OAUTH_STATE_COOKIE,
  resolveGoogleRedirectUri,
} from "@/lib/google-calendar/config";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        `/login?redirect=${encodeURIComponent("/integraciones")}`
      );
    }

    const origin = new URL(request.url).origin;
    const state = randomUUID();
    const redirectUri = resolveGoogleRedirectUri(origin);
    console.info("[Google OAuth] Starting authorization", {
      redirect_uri: redirectUri,
      user_id: user.id,
    });
    const authUrl = buildGoogleAuthUrl(origin, state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OAuth configuration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
