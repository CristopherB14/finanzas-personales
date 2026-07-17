# 0003 — Client-generated `client_id` for sync idempotency

## Context

Offline-first writes (ADR 0001) can be retried (flaky network, app restarted mid-sync) or replayed
across devices. Using the database-assigned `id` as the idempotency key doesn't work: a row created
offline has no server `id` yet (it gets a temporary `local-<uuid>` placeholder), and a naive retry of
an insert would create a duplicate row.

## Decision

Every syncable row gets a **client-generated UUID** (`client_id`) at creation time, stored alongside
the eventual server `id`. The database enforces `UNIQUE (user_id, client_id)`, and all sync writes
are `upsert(...).onConflict("user_id,client_id")` (`src/lib/sync/sync-engine.ts`) rather than plain
inserts. After a successful sync, the local placeholder id is reconciled to the real server id
(`reconcileLocalTransactionId`), and any duplicate rows sharing the same `client_id` are cleaned up
(`dedupeLocalTransactionsByClientId`).

## Consequences

- Retrying a push is always safe — same `client_id` in, same row out, never a duplicate.
- Every table that wants offline/sync support must carry a `client_id` column and this unique
  constraint from day one; retrofitting it onto existing rows means backfilling a value.
- `id` is not a stable identifier across the local/remote boundary during the brief window before a
  new row first syncs — code that stores a reference to a transaction (e.g.
  `google_event_id` linking, deterministic recurring/payment transaction ids) uses `client_id`, not
  `id`, as the durable key.
