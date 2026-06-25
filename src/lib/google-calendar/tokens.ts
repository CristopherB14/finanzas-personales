import { createAdminClient } from "@/lib/supabase/admin";
import {
  getGoogleOAuthConfig,
  GOOGLE_REVOKE_URL,
  GOOGLE_TOKEN_URL,
} from "@/lib/google-calendar/config";

export interface UserGoogleIntegration {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  calendar_id: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

export async function getUserGoogleIntegration(
  userId: string
): Promise<UserGoogleIntegration | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_google_integrations")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function refreshAccessToken(
  integration: UserGoogleIntegration,
  origin: string
): Promise<UserGoogleIntegration> {
  const { clientId, clientSecret } = getGoogleOAuthConfig(origin);

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${errorBody}`);
  }

  const tokens = (await response.json()) as GoogleTokenResponse;
  const expiryDate = Date.now() + tokens.expires_in * 1000;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_google_integrations")
    .update({
      access_token: tokens.access_token,
      expiry_date: expiryDate,
      ...(tokens.refresh_token
        ? { refresh_token: tokens.refresh_token }
        : {}),
    })
    .eq("user_id", integration.user_id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Returns a valid access token, refreshing if expired (with 60s buffer). */
export async function getValidAccessToken(
  userId: string,
  origin: string
): Promise<{ accessToken: string; calendarId: string }> {
  const integration = await getUserGoogleIntegration(userId);
  if (!integration) {
    throw new Error("Google Calendar not connected");
  }

  const isExpired = Date.now() >= integration.expiry_date - 60_000;
  const current = isExpired
    ? await refreshAccessToken(integration, origin)
    : integration;

  return {
    accessToken: current.access_token,
    calendarId: current.calendar_id,
  };
}

export async function saveGoogleIntegration(
  userId: string,
  tokens: {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
    calendar_id?: string;
  }
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("user_google_integrations").upsert(
    {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      calendar_id: tokens.calendar_id ?? "primary",
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}

/** Best-effort revocation of the OAuth grant at Google. Never throws. */
async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(GOOGLE_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  } catch (err) {
    // Revocation is best-effort; local deletion below is the source of truth.
    console.error("Google token revocation failed", err);
  }
}

export async function deleteGoogleIntegration(userId: string): Promise<void> {
  const supabase = createAdminClient();

  // Revoke the grant at Google first so a previously-leaked refresh token
  // cannot continue to be used after the user disconnects.
  const integration = await getUserGoogleIntegration(userId);
  if (integration?.refresh_token) {
    await revokeGoogleToken(integration.refresh_token);
  }

  const { error } = await supabase
    .from("user_google_integrations")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}

export async function exchangeCodeForTokens(
  code: string,
  origin: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(origin);

  console.info("[Google OAuth] Token exchange request", {
    redirect_uri: redirectUri,
    client_id: clientId,
    grant_type: "authorization_code",
    code_length: code.length,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    console.error("[Google OAuth] Token exchange failed", {
      status: response.status,
      redirect_uri: redirectUri,
      response: responseBody,
    });
    throw new Error(`Token exchange failed (${response.status}): ${responseBody}`);
  }

  let tokens: GoogleTokenResponse;
  try {
    tokens = JSON.parse(responseBody) as GoogleTokenResponse;
  } catch {
    console.error("[Google OAuth] Token exchange invalid JSON", {
      redirect_uri: redirectUri,
      response: responseBody,
    });
    throw new Error("Token exchange returned invalid JSON");
  }

  console.info("[Google OAuth] Token exchange succeeded", {
    redirect_uri: redirectUri,
    expires_in: tokens.expires_in,
    has_refresh_token: Boolean(tokens.refresh_token),
  });

  if (!tokens.refresh_token) {
    throw new Error("No refresh token received. Revoke access and reconnect.");
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: Date.now() + tokens.expires_in * 1000,
  };
}
