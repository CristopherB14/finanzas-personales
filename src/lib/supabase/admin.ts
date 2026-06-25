import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

type UserGoogleIntegrationRow = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  calendar_id: string;
  created_at: string;
  updated_at: string;
};

/**
 * Minimal typed schema covering only the confidential tables the service-role
 * client is allowed to touch. Keeping this surface intentionally small enforces
 * least privilege at the type level.
 */
export interface AdminDatabase {
  public: {
    Tables: {
      user_google_integrations: {
        Row: UserGoogleIntegrationRow;
        Insert: Omit<UserGoogleIntegrationRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<UserGoogleIntegrationRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/**
 * Service-role Supabase client. SERVER-ONLY.
 *
 * This client bypasses Row Level Security and must NEVER be imported into
 * client components or exposed to the browser. It is used exclusively for
 * confidential, backend-only data such as OAuth tokens
 * (`user_google_integrations`) that must not be readable by the authenticated
 * (anon-key) role.
 *
 * The service-role key is read from `SUPABASE_SERVICE_ROLE_KEY`, which is NOT a
 * `NEXT_PUBLIC_` variable and therefore is never inlined into client bundles.
 */
type AdminClient = SupabaseClient<AdminDatabase>;

let cached: AdminClient | null = null;

export function createAdminClient(): AdminClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (typeof window !== "undefined") {
    throw new Error("createAdminClient must only be used on the server");
  }

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase service-role configuration (SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  cached = createSupabaseClient<AdminDatabase>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}
