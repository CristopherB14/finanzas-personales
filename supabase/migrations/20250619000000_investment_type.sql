-- Investment as first-class transaction and category type.
-- Portfolio assets keyed by subcategory; market_value_cents reserved for future pricing.

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'investment';
ALTER TYPE category_type ADD VALUE IF NOT EXISTS 'investment';

CREATE TABLE investment_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  invested_cents BIGINT NOT NULL DEFAULT 0 CHECK (invested_cents >= 0),
  market_value_cents BIGINT CHECK (market_value_cents IS NULL OR market_value_cents >= 0),
  currency_code TEXT NOT NULL DEFAULT 'ARS',
  client_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, subcategory_id)
);

CREATE INDEX idx_investment_assets_user ON investment_assets(user_id);
CREATE INDEX idx_investment_assets_subcategory ON investment_assets(subcategory_id);

ALTER TABLE transactions
  ADD COLUMN investment_asset_id UUID REFERENCES investment_assets(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_investment_asset ON transactions(investment_asset_id);

CREATE TRIGGER investment_assets_updated_at BEFORE UPDATE ON investment_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE investment_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY investment_assets_select ON investment_assets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY investment_assets_insert ON investment_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY investment_assets_update ON investment_assets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY investment_assets_delete ON investment_assets
  FOR DELETE USING (auth.uid() = user_id);
