# 0001 — Offline-first with Dexie + Supabase

## Context

A personal-finance app needs to work reliably when the user has no or intermittent connectivity
(commuting, mobile data drops), and financial data entry needs to feel instant — a loading spinner
on "save expense" is a bad experience for a < 10 second action.

## Decision

Every write lands in the browser's IndexedDB (via Dexie, `src/lib/db/local-db.ts`) first and
synchronously. A background sync engine (`src/lib/sync/sync-engine.ts`) pushes queued changes to
Supabase and pulls remote changes, but the UI always reads from the local store and never blocks on
network. Supabase (Postgres + Auth + RLS) is the durable, multi-device source of truth; IndexedDB is
a local cache/outbox.

## Consequences

- The UI is instant and works fully offline for read + write of transactions.
- Complexity moves into the sync layer: idempotency (`client_id`, see ADR 0003), conflict
  resolution (last-write-wins), and keeping the Dexie schema in sync with the Postgres schema.
- Only `transactions` currently participate in this pattern — accounts/categories are Supabase-only
  writes (see [`../../KNOWN_ISSUES.md`](../../KNOWN_ISSUES.md)). Extending offline support to another
  table means repeating this pattern deliberately, not assuming it's automatic.
- A user who never syncs before clearing browser storage loses unsynced data — there's no
  server-side draft/backup of pending local writes.
