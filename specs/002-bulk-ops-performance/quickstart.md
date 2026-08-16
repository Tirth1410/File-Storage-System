# Quickstart — Validating the Bulk Operations Performance Fix

**Feature**: `specs/002-bulk-ops-performance` | **Date**: 2026-08-15
**Purpose**: Runnable validation scenarios proving the feature end-to-end.
Implementation details live in `plan.md`, `research.md`, `data-model.md`, and
`contracts/bulk-operations-api.md` — this is a validation/run guide only.

## Prerequisites

- Supabase-backed PostgreSQL running, `.env` populated with `DATABASE_URL`
  (pooled) and `DIRECT_URL` (direct).
- Project bootstrapped:

```bash
bun install
bun prisma db push
bun prisma generate
bun run db:seed
```

- Dev server:

```bash
bun run dev
```

- A logged-in account with a library of **at least 501 files** (so the
  select-all >500 rejection is reachable) and at least one group the account
  belongs to.

## Automated checks

```bash
bun run typecheck   # must pass
bun run lint        # must pass
bun test            # unit tests: bulkMove / bulkShare cap, single set-based statement, audit createMany, select-all resolution
bun prisma migrate status  # must report no schema drift (no migrations expected)
```

Unit tests to expect (added alongside the change; see `plan.md` project
structure):

- `folder-service.test.ts` — 500-cap rejection; one descendant-check query (not
  one per folder); one `auditLog.createMany` per operation; classification
  (skipped/forbidden/notFound) unchanged.
- `group-service.test.ts` / `share-service.test.ts` — 500-cap rejection; a
  single ON CONFLICT upsert statement for the whole selection; one
  `auditLog.createMany`; select-all resolution.
- `route` handlers — `400` on cap, `401` unauthenticated, `400` on missing
  email/groupId/ids.

## Manual validation scenarios

### S1 — Bulk move is fast (SC-001, SC-004)

1. In **My Files**, navigate to a folder containing 500 files/folders and use
   **select all** (or select 500 items explicitly).
2. Click **Move**, pick a target folder, confirm; start timing at confirm.
3. **Expected**: completes in **<3s**; toast shows correct moved/skipped counts;
   all items appear in the target; audit history shows one entry per moved item
   (see S5). A 250-item run takes ~half the time (no disproportionate
   per-item slowdown).

### S2 — Bulk share with a group completes (SC-002)

1. Select **500 files**, click **Share**, choose the group, confirm.
2. **Expected**: completes in **<5s** with no error (previously timed out at
   5000 ms); every eligible file is accessible to the group with the chosen
   preview/download settings; no duplicate shares after repeating to the same
   group (existing rows updated, FR-010).

### S3 — Bulk share with a user completes (SC-003)

1. Select **500 files**, click **Share**, enter a **registered** recipient email,
   confirm.
2. **Expected**: completes in **<5s**; every eligible file shared at the chosen
   permission level; no duplicates on repeat.

### S4 — Select-all share resolves server-side (FR-006)

1. With **select all** active on a folder whose visible page shows only ~25 of
   hundreds of files, click **Share** and share with a group/user.
2. **Expected**: the request sends `selectAll` + source folder + excludes, and
   **all** owned available files in the folder are shared — not just the visible
   page (previously a silent bug).

### S5 — Audit trail completeness (FR-009, SC-006)

1. After S1/S2/S3, query the DB for the acting user's audit rows for the
   operation (actions `file_moved`, `folder_moved`, `file_shared`,
   `group_file_shared`):

```sql
SELECT action, COUNT(*) FROM audit_log
WHERE user_id = '<your-user-id>' AND created_at >= now() - interval '30 minutes'
GROUP BY action;
```

2. **Expected**: `COUNT` per action equals the number of items reported as
   moved/shared for that run; zero orphan rows after a failed run (atomicity).

### S6 — Oversized select-all is rejected (FR-004, SC-005)

1. In a folder with **>500 files**, use **select all** and attempt a move or
   share.
2. **Expected**: a clear error **"Cannot move/share more than 500 items at
   once"** (`400`) is shown; **nothing** is moved or shared (no partial
   processing). The same applies to an explicit request with >500 ids.

### S7 — No raw timeout errors (FR-011)

1. Trigger any of the above, including a concurrent share while an upload
   transaction is running.
2. **Expected**: the user sees clear, human-readable messages — never a message
   containing "expired transaction", "rollback cannot be executed", or a raw
   Prisma error.

### S8 — No-account invite path still works (edge case)

1. Share a batch of files with an email that has **no account**.
2. **Expected**: pending invitations are created as today and invite emails are
   sent; operation completes within a predictable time (email-provider latency
   is the floor — see `research.md` D7 residual risk); audit rows for
   `invite_sent` match the count.

## Cross-references

- Contracts & response shapes: `contracts/bulk-operations-api.md`
- Entities/invariants the validation relies on: `data-model.md`
- Design decisions & rationale: `research.md`
