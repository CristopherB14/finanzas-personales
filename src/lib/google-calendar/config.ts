export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_CALENDAR_API =
  "https://www.googleapis.com/calendar/v3";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** Safe presence summary for server logs — never includes secret values. */
export function getGoogleOAuthEnvDiagnostics() {
  const clientId = readEnv("GOOGLE_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = readEnv("GOOGLE_REDIRECT_URI");

  return {
    has_client_id: Boolean(clientId),
    client_id_length: clientId?.length ?? 0,
    client_id_suffix: clientId ? clientId.slice(-8) : null,
    has_client_secret: Boolean(clientSecret),
    client_secret_length: clientSecret?.length ?? 0,
    has_redirect_uri: Boolean(redirectUri),
    redirect_uri: redirectUri ?? null,
    node_env: process.env.NODE_ENV ?? null,
    vercel_env: process.env.VERCEL_ENV ?? null,
  };
}

export function resolveGoogleRedirectUri(origin: string): string {
  const configured = readEnv("GOOGLE_REDIRECT_URI");
  if (configured) return configured.replace(/\/$/, "");
  return `${origin.replace(/\/$/, "")}/api/google-calendar/callback`;
}

export function getGoogleOAuthConfig(origin: string) {
  const clientId = readEnv("GOOGLE_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = resolveGoogleRedirectUri(origin);

  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");

  if (missing.length > 0) {
    console.error("[Google OAuth] Missing required environment variables", {
      missing,
      ...getGoogleOAuthEnvDiagnostics(),
    });
    throw new Error(
      `Missing ${missing.join(" and ")} environment variable${
        missing.length > 1 ? "s" : ""
      }`
    );
  }

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    redirectUri,
  };
}

export function buildGoogleAuthUrl(
  origin: string,
  state: string
): string {
  const { clientId, redirectUri } = getGoogleOAuthConfig(origin);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}
