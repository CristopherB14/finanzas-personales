-- Google Calendar OAuth integration tokens (backend-only access via API routes)

CREATE TABLE user_google_integrations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date BIGINT NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER user_google_integrations_updated_at
  BEFORE UPDATE ON user_google_integrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- OAuth tokens are secrets and must NEVER be reachable by the browser anon key.
-- RLS is enabled with NO policy, which denies all access to the anon/authenticated
-- roles. Server API routes access this table exclusively via the service-role key
-- (which bypasses RLS), scoping every query by user_id in application code.
ALTER TABLE user_google_integrations ENABLE ROW LEVEL SECURITY;

-- Drop any prior client-accessible policy (earlier revisions exposed tokens to the
-- authenticated/anon roles via `FOR ALL USING (auth.uid() = user_id)`).
DROP POLICY IF EXISTS user_google_integrations_all ON user_google_integrations;

-- Defense in depth: explicitly revoke direct table access from client-facing roles.
REVOKE ALL ON user_google_integrations FROM anon, authenticated;

-- Optional: store Google event ID on transactions for future update/delete sync
ALTER TABLE transactions ADD COLUMN google_event_id TEXT;

CREATE INDEX idx_transactions_google_event
  ON transactions(google_event_id)
  WHERE google_event_id IS NOT NULL;
