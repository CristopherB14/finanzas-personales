import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  resolveGoogleRedirectUri,
} from "@/lib/google-calendar/config";
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

  const redirectUri = resolveGoogleRedirectUri(origin);
  console.info("[Google OAuth] Callback received", {
    code,
    redirect_uri: redirectUri,
    user_id: user.id,
  });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "[Google OAuth] Cannot store tokens: SUPABASE_SERVICE_ROLE_KEY is missing"
    );
    return NextResponse.redirect(
      `${redirectBase}?google=error&message=storage_not_configured`
    );
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code, origin);
  } catch (err) {
    console.error("[Google OAuth] Token exchange step failed", err);
    return NextResponse.redirect(
      `${redirectBase}?google=error&message=token_exchange_failed`
    );
  }

  try {
    await saveGoogleIntegration(user.id, tokens);
  } catch (err) {
    console.error("[Google OAuth] Token storage step failed", err);
    return NextResponse.redirect(
      `${redirectBase}?google=error&message=token_storage_failed`
    );
  }

  return NextResponse.redirect(`${redirectBase}?google=connected`);
}
