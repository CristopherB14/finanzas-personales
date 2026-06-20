-- Transfer transactions: destination account on a single row
ALTER TABLE transactions
  ADD COLUMN to_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;

ALTER TABLE transactions
  ADD CONSTRAINT transfer_requires_to_account CHECK (
    (type = 'transfer' AND to_account_id IS NOT NULL AND account_id <> to_account_id)
    OR (type <> 'transfer' AND to_account_id IS NULL)
  );

CREATE INDEX idx_transactions_to_account ON transactions (to_account_id);
