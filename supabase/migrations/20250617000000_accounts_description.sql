-- Agregar descripción e identificadores visuales a cuentas

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;
