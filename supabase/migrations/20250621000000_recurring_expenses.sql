-- Recurring expenses with RRULE-compatible recurrence and calendar sync metadata

CREATE TYPE recurrence_frequency AS ENUM (
  'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'
);

CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  currency_code TEXT NOT NULL DEFAULT 'ARS',
  start_date DATE NOT NULL,
  end_date DATE,
  frequency recurrence_frequency NOT NULL DEFAULT 'monthly',
  recurrence_rule JSONB NOT NULL DEFAULT '{"freq":"MONTHLY","interval":1}'::jsonb,
  next_due_date DATE NOT NULL,
  last_generated_date DATE,
  auto_create BOOLEAN NOT NULL DEFAULT false,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  sync_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

ALTER TABLE transactions
  ADD COLUMN recurring_expense_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL;

CREATE INDEX idx_recurring_expenses_user_next
  ON recurring_expenses(user_id, next_due_date)
  WHERE is_active = true;

CREATE INDEX idx_recurring_expenses_user_client
  ON recurring_expenses(user_id, client_id);

CREATE INDEX idx_transactions_recurring
  ON transactions(recurring_expense_id)
  WHERE recurring_expense_id IS NOT NULL;

CREATE TRIGGER recurring_expenses_updated_at BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurring_expenses_all ON recurring_expenses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
