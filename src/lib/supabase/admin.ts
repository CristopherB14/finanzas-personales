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

type PaymentAttemptStatus =
  | "pending"
  | "checkout_created"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "in_process";

type PaymentWebhookStatus = "received" | "processed" | "ignored" | "error";

type PaymentAttemptRow = {
  id: string;
  user_id: string;
  provider: string;
  status: PaymentAttemptStatus;
  amount_cents: number;
  currency_code: string;
  account_id: string;
  category_id: string | null;
  description: string | null;
  transaction_date: string;
  recurring_expense_id: string | null;
  occurrence_date: string | null;
  transaction_client_id: string;
  provider_preference_id: string | null;
  provider_payment_id: string | null;
  external_reference: string;
  checkout_url: string | null;
  original_amount_cents: number | null;
  exchange_rate: number | null;
  converted_amount_cents: number | null;
  exchange_rate_source: "bna" | "manual" | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type PaymentWebhookEventRow = {
  id: string;
  provider: string;
  provider_event_key: string;
  topic: string | null;
  action: string | null;
  provider_resource_id: string | null;
  payload: Record<string, unknown>;
  signature_valid: boolean;
  processing_status: PaymentWebhookStatus;
  payment_attempt_id: string | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

type AdminTransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: string;
  amount_cents: number;
  currency_code: string;
  original_amount_cents: number | null;
  exchange_rate: number | null;
  converted_amount_cents: number | null;
  exchange_rate_source: string | null;
  transaction_date: string;
  description: string | null;
  tags: string[];
  client_id: string;
  recurring_expense_id: string | null;
};

type IdRow = { id: string };

type RecurringExpenseAdminRow = {
  id: string;
  user_id: string;
  next_due_date: string;
  recurrence_rule: Record<string, unknown>;
  end_date: string | null;
  last_generated_date: string | null;
};

/**
 * Minimal typed schema covering only the confidential / server-side tables the
 * service-role client is allowed to touch. Keeping this surface intentionally
 * small enforces least privilege at the type level.
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
      payment_attempts: {
        Row: PaymentAttemptRow;
        Insert: Omit<PaymentAttemptRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
          provider_preference_id?: string | null;
          provider_payment_id?: string | null;
          checkout_url?: string | null;
          error_message?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<PaymentAttemptRow>;
        Relationships: [];
      };
      payment_webhook_events: {
        Row: PaymentWebhookEventRow;
        Insert: Omit<
          PaymentWebhookEventRow,
          "id" | "created_at" | "processed_at" | "payment_attempt_id" | "error_message"
        > & {
          id?: string;
          created_at?: string;
          processed_at?: string | null;
          payment_attempt_id?: string | null;
          error_message?: string | null;
          processing_status?: PaymentWebhookStatus;
        };
        Update: Partial<PaymentWebhookEventRow>;
        Relationships: [];
      };
      transactions: {
        Row: AdminTransactionRow;
        Insert: AdminTransactionRow;
        Update: Partial<AdminTransactionRow>;
        Relationships: [];
      };
      accounts: {
        Row: IdRow & { user_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      categories: {
        Row: IdRow & { user_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      recurring_expenses: {
        Row: RecurringExpenseAdminRow;
        Insert: never;
        Update: Partial<
          Pick<
            RecurringExpenseAdminRow,
            "next_due_date" | "last_generated_date"
          >
        >;
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
 * (`user_google_integrations`) and payment settlement that must not be
 * writable by the authenticated (anon-key) role.
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
