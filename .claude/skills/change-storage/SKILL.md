---
name: change-storage
description: Rules and procedure for any change to persisted data — IndexedDB schema, attempt shape, settings keys, or the backup format. Use before touching src/shell/storage or anything that reads/writes user progress.
---

# Change storage safely

User data (streaks, months of attempts) lives only in the browser. A careless
schema change destroys it with no server-side recovery. Treat every change here
as a migration problem.

## Invariants (do not break)

1. **Attempts are append-only.** Never rewrite, renumber, or delete stored
   attempts. Derived numbers (accuracy, streak) are computed, never stored as
   the source of truth.
2. **Exercise ids are forever.** They key the attempt log. If an exercise must
   be renamed, map the old id at read time — don't touch stored rows.
3. **Settings live under `setting:` keys in the kv store**; per-day state uses
   date-suffixed keys (e.g. `practice:2026-07-19`). Local dates only
   (`toLocalDateStr`), never UTC — v0's UTC bug is why the migration exists.

## Schema changes

- Bump `DB_VERSION` in `idb-store.ts` and extend the `upgrade` callback with a
  per-version block (`if (oldVersion < N) ...`). Upgrades must be cumulative —
  a user may jump several versions at once.
- `migrate-v0.ts` opens the same DB with the same version — keep its `upgrade`
  in sync or extract a shared function when it changes again.
- New object stores/indexes: also extend `exportAll`/`importAll` and bump the
  `Backup` shape thoughtfully (see below).

## Backup format

`Backup.version` is a contract with files users have already downloaded.
- Additive fields: fine, keep `version: 1`.
- Breaking shape changes: bump `version` and make `importAll` accept **all**
  prior versions. Never let an old backup fail to import.

## Testing (required, not optional)

Every storage change ships with `fake-indexeddb` tests in `storage.test.ts`:
- fresh-install path (no existing data)
- upgrade path (seed data in the old shape, open with the new version, assert
  nothing lost)
- export → wipe → import round-trip still restores everything

Also update the storage section of `docs/ARCHITECTURE.md` in the same PR.
