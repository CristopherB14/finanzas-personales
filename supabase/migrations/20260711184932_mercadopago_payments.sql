-- Mercado Pago payments MVP
-- Tracks checkout attempts and webhook deliveries for idempotent settlement.

CREATE TYPE payment_attempt_status AS ENUM (
  'pending',
  'checkout_created',
  'approved',
  'rejected',
  'cancelled',
  'refunded',
  'in_process'
);

CREATE TYPE payment_webhook_status AS ENUM (
  'received',
  'processed',
  'ignored',
  'error'
);

CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  status payment_attempt_status NOT NULL DEFAULT 'pending',
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency_code TEXT NOT NULL DEFAULT 'ARS'
    CHECK (currency_code IN ('ARS', 'USD')),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring_expense_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL,
  occurrence_date DATE,
  -- Deterministic ledger key used when creating the expense transaction.
  transaction_client_id UUID NOT NULL,
  provider_preference_id TEXT,
  provider_payment_id TEXT,
  external_reference TEXT NOT NULL,
  checkout_url TEXT,
  original_amount_cents BIGINT,
  exchange_rate NUMERIC,
  converted_amount_cents BIGINT,
  exchange_rate_source TEXT CHECK (
    exchange_rate_source IS NULL OR exchange_rate_source IN ('bna', 'manual')
  ),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, transaction_client_id),
  UNIQUE (provider, external_reference),
  UNIQUE (provider, provider_payment_id)
);

CREATE TABLE payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  -- Notification id when available; otherwise payment id + action.
  provider_event_key TEXT NOT NULL,
  topic TEXT,
  action TEXT,
  provider_resource_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  processing_status payment_webhook_status NOT NULL DEFAULT 'received',
  payment_attempt_id UUID REFERENCES payment_attempts(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider, provider_event_key)
);

CREATE INDEX idx_payment_attempts_user_created
  ON payment_attempts(user_id, created_at DESC);
CREATE INDEX idx_payment_attempts_status
  ON payment_attempts(user_id, status);
CREATE INDEX idx_payment_attempts_preference
  ON payment_attempts(provider_preference_id)
  WHERE provider_preference_id IS NOT NULL;
CREATE INDEX idx_payment_webhook_events_created
  ON payment_webhook_events(created_at DESC);

CREATE TRIGGER payment_attempts_updated_at
  BEFORE UPDATE ON payment_attempts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Users can read their own payment attempts (status UI).
-- All writes go through server API routes (session or service role).
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_attempts_select_own ON payment_attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Webhook log is backend-only (contains raw provider payloads).
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON payment_webhook_events FROM anon, authenticated;
