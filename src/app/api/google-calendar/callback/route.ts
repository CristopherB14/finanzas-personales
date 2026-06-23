import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google-calendar/config";
import { exchangeCodeForTokens, saveGoogleIntegration } from "@/lib/google-calendar/tokens";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const origin = url.origin;
  const redirectBase = `${origin}/integraciones`;

  if (error) {
    // Reflect only the provider's stable error code (whitelisted charset).
    const safeError = /^[a-z_]{1,40}$/.test(error) ? error : "access_denied";
    return NextResponse.redirect(
      `${redirectBase}?google=error&message=${encodeURIComponent(safeError)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?google=error&message=missing_code`);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      `${redirectBase}?google=error&message=invalid_state`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `/login?redirect=${encodeURIComponent("/integraciones")}`
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code, origin);
    await saveGoogleIntegration(user.id, tokens);
    return NextResponse.redirect(`${redirectBase}?google=connected`);
  } catch (err) {
    // Internal/upstream detail is logged server-side only, never reflected.
    console.error("Google Calendar OAuth callback failed", err);
    return NextResponse.redirect(
      `${redirectBase}?google=error&message=token_exchange_failed`
    );
  }
}
