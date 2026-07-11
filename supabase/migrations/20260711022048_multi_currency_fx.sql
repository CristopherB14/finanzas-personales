-- Multi-currency (ARS/USD): original amount, exchange rate, converted amount

-- Restrict supported currencies on accounts
ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_currency_code_check;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_currency_code_check
  CHECK (currency_code IN ('ARS', 'USD'));

-- Transactions: FX metadata (amount_cents remains the account-currency impact)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS original_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS converted_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS exchange_rate_source TEXT;

UPDATE transactions
SET original_amount_cents = amount_cents
WHERE original_amount_cents IS NULL;

ALTER TABLE transactions
  ALTER COLUMN original_amount_cents SET NOT NULL,
  ALTER COLUMN original_amount_cents SET DEFAULT 0;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_currency_code_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_currency_code_check
  CHECK (currency_code IN ('ARS', 'USD'));

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_exchange_rate_source_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_exchange_rate_source_check
  CHECK (
    exchange_rate_source IS NULL
    OR exchange_rate_source IN ('bna', 'manual')
  );

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_exchange_rate_positive_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_exchange_rate_positive_check
  CHECK (exchange_rate IS NULL OR exchange_rate > 0);

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_original_amount_positive_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_original_amount_positive_check
  CHECK (original_amount_cents > 0);

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_converted_amount_positive_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_converted_amount_positive_check
  CHECK (converted_amount_cents IS NULL OR converted_amount_cents > 0);

-- Recurring expenses: same FX fields (generated txs reuse stored rate)
ALTER TABLE recurring_expenses
  ADD COLUMN IF NOT EXISTS original_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS converted_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS exchange_rate_source TEXT;

UPDATE recurring_expenses
SET original_amount_cents = amount_cents
WHERE original_amount_cents IS NULL;

ALTER TABLE recurring_expenses
  ALTER COLUMN original_amount_cents SET NOT NULL,
  ALTER COLUMN original_amount_cents SET DEFAULT 0;

ALTER TABLE recurring_expenses
  DROP CONSTRAINT IF EXISTS recurring_expenses_currency_code_check;

ALTER TABLE recurring_expenses
  ADD CONSTRAINT recurring_expenses_currency_code_check
  CHECK (currency_code IN ('ARS', 'USD'));

ALTER TABLE recurring_expenses
  DROP CONSTRAINT IF EXISTS recurring_expenses_exchange_rate_source_check;

ALTER TABLE recurring_expenses
  ADD CONSTRAINT recurring_expenses_exchange_rate_source_check
  CHECK (
    exchange_rate_source IS NULL
    OR exchange_rate_source IN ('bna', 'manual')
  );

ALTER TABLE recurring_expenses
  DROP CONSTRAINT IF EXISTS recurring_expenses_exchange_rate_positive_check;

ALTER TABLE recurring_expenses
  ADD CONSTRAINT recurring_expenses_exchange_rate_positive_check
  CHECK (exchange_rate IS NULL OR exchange_rate > 0);

ALTER TABLE investment_assets
  DROP CONSTRAINT IF EXISTS investment_assets_currency_code_check;

ALTER TABLE investment_assets
  ADD CONSTRAINT investment_assets_currency_code_check
  CHECK (currency_code IN ('ARS', 'USD'));
