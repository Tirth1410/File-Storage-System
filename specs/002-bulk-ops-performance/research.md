# Research — Bulk Operations Performance & Reliability Fix

**Feature**: `specs/002-bulk-ops-performance` | **Date**: 2026-08-15
**Inputs**: feature spec; code at `app/lib/folder-service.ts`,
`group-service.ts`, `share-service.ts`, `invitation-service.ts`,
`file-service.ts`, `app/api/files/bulk-{move,share,share/group,delete}/route.ts`,
`app/dashboard/page.tsx`, `app/components/shared/{ShareModal,FileAccessManager}.tsx`,
`prisma/schema.prisma`.

## 1. Root-cause confirmation (from code)

| Flow                      | Hot spot                                                                              | Effect                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| bulk move                 | per-folder recursive-CTE descendant check, folder-service.ts:552-572                  | N round trips (one per selected folder) before the transaction                              |
| bulk move                 | sequential `auditService.log` per item, folder-service.ts:622-639                     | N+1 `auditLog.create` round trips; ~50-200ms each against remote Supabase → 10-20s at scale |
| bulk share group          | array `$transaction(shared.map(...groupFile.upsert))`, group-service.ts:507-524       | default 5000 ms interactive-transaction timeout; observed failure "5534 ms passed"          |
| bulk share user           | array `$transaction(shared.map(...filePermission.upsert))`, share-service.ts:194-208  | same timeout exposure                                                                       |
| bulk share user (invites) | per-file `upsertInvite` + `deliverInviteEmail` + audit, invitation-service.ts:250-274 | per-file DB write + per-file email send + per-file audit                                    |
| select-all share          | `handleBatchShare` sends only current page's file IDs, dashboard/page.tsx:401-410     | select-all + share silently shares just the visible page                                    |

Bulk delete (the precedent) is already set-based: `MAX_BULK_DELETE_FILES = 500`
(file-service.ts:52, enforced at 545-552), `auditLog.createMany` inside one
interactive transaction with `TRANSACTION_TIMEOUT` (file-service.ts:714/724).
Bulk move state changes are already `updateMany` inside one transaction with
`TRANSACTION_TIMEOUT` (folder-service.ts:607-620) — only the classification and
audit phases are N+1.

## 2. Decisions

### D1 — Share upserts use a single parameterized `INSERT ... ON CONFLICT ... DO UPDATE`

- **Decision**: Replace the array-`$transaction` upsert loops in
  `bulkShareWithGroup` and `bulkShareWithUser` with one raw SQL statement per
  table: `INSERT INTO group_file (...) VALUES (...) ON CONFLICT (group_id,
file_id) DO UPDATE SET ...` and the equivalent for `file_permission` on
  `(file_id, user_id)`, built with `Prisma.sql` + `Prisma.join` so every value
  is bound (no string interpolation). Wrapped in one interactive transaction
  with `TRANSACTION_TIMEOUT`.
- **Rationale**: A single round trip for the entire state change; atomic upsert
  honoring the existing unique constraints (`@@unique([groupId, fileId])`,
  `@@unique([fileId, userId])`); exactly the "single bulk insert/update
  statements" the user requested; mirrors bulk-delete's set-based philosophy.
  Parameter binding keeps it injection-safe (G4). Interactive transaction with
  the project's established timeout budget means a large share finishes in
  milliseconds instead of failing at 5000 ms.
- **Alternatives considered**:
  - Keep array `$transaction(...upsert)` — current, fails for large selections.
  - `createMany({ skipDuplicates })` + separate `updateMany` — two statements
    with a race window between them; `skipDuplicates` needs the unique
    constraints (present here) but yields no update for existing rows and is
    less atomic than ON CONFLICT.

### D2 — Audit writes batch into one `auditLog.createMany` inside the same transaction

- **Decision**: Replace the sequential `auditService.log` loops in bulk move,
  bulk share group, and bulk share user with a single
  `tx.auditLog.createMany({ data: [...] })` executed inside the same interactive
  transaction as the state change (bulk-delete precedent, file-service.ts:714).
  Keep the single-item `auditService.log` for all non-bulk paths unchanged.
- **Rationale**: N+1 → 1 statement; audit entries become atomic with the state
  change (FR-009/SC-006: every committed item has an entry). For the invite
  path, batch the `invite_sent` audit rows the same way.
- **Alternatives considered**: Per-item `auditService.log` inside the tx —
  retains the N+1 behavior that causes the slowness.
- **Note**: behavior change is deliberate — audit failures now abort the
  operation rather than being swallowed (audit-service.ts:28-30 catches and
  logs). This is the stronger guarantee the spec requires and matches bulk
  delete.

### D3 — Bulk move descendant check runs in one query

- **Decision**: Replace the per-folder `getDescendantCteSql()` loop
  (folder-service.ts:552-572) with a single recursive CTE seeded by all valid
  folder IDs that returns the set of selected folders whose subtree contains
  the target folder: e.g. seed `folder.id IN (selectedIds)`, walk descendants
  carrying the seed root, `SELECT DISTINCT root_id ... WHERE id = targetId`.
  Implemented as a parameterized raw query (values bound via `Prisma.join`).
- **Rationale**: One round trip regardless of folder count; output is exactly
  the per-item `failed` classification the result contract needs
  ("Cannot move a folder into itself or one of its descendants").
- **Alternatives considered**: Keep one CTE per folder (current) — N round
  trips; compute ancestor set of target in one query and intersect with selected
  folders — also one query, but the seeded-CTE form reuses the existing
  `getDescendantCteSql` semantics and stays explicit.

### D4 — Reads stay outside the transaction; only writes go inside

- **Decision**: Keep the existing structure: classify (fetch rows, ownership,
  eligibility, descendant check) before opening the transaction; then one
  interactive transaction containing only the set-based state change + the
  `auditLog.createMany`, using `TRANSACTION_TIMEOUT` (`{ maxWait: 10_000,
timeout: 20_000 }`, folder-service.ts:32).
- **Rationale**: Bounds the lock window to the write phase (now a handful of
  statements), avoiding quota-row/foreign-key contention and keeping well under
  timeouts. Matches the existing bulk-move/delete structure, minimizing risk.
- **Alternatives considered**: Wrap classification reads in the same
  transaction — wider lock scope for no benefit at this scale.

### D5 — Shared 500-item cap enforced in services, mapped to 400 in routes

- **Decision**: New `app/lib/bulk.ts` exports `MAX_BULK_OPERATION_ITEMS = 500`.
  Enforce in `bulkMove` (after select-all resolution, `fileIds.length +
folderIds.length`), `bulkShareWithGroup`, and `bulkShareWithUser` (after
  select-all resolution) by throwing a clear validation error
  ("Cannot move/share more than 500 items at once" — matching bulk-delete's
  phrasing, file-service.ts:550). Routes map it to HTTP 400. Reuse
  `MAX_BULK_DELETE_FILES` or alias it to the shared constant so delete, move,
  and share stay in lockstep.
- **Rationale**: FR-004; deterministic contract; consistent with the existing
  bulk-delete limit the user chose to match (clarification answer A). Enforced
  server-side after select-all resolution so "select all" on a library >500 is
  rejected with a clear message (SC-005), never processed or failed partway.
- **Alternatives considered**: Per-service literals — drift risk; cap only in
  routes — select-all resolution happens in services, so enforcement must too.

### D6 — Select-all is forwarded to the share flow and resolved server-side

- **Decision**: Extend `bulkShareWithGroup` and `bulkShareWithUser` to accept
  `selectAll?: boolean`, `sourceFolderId?: string | null`,
  `excludeIds?: string[]`, resolving the file set server-side exactly like
  `bulkMove`/`bulkDelete` (owner + `status: "available"` in the source folder,
  minus excludes). Dashboard `handleBatchShare` passes the select-all context
  (dashboard/page.tsx:401-410); `ShareModal`/`FileAccessManager` forward it to
  both bulk-share endpoints.
- **Rationale**: FR-006; today select-all + share only shares the visible page —
  a latent bug. Server-side resolution is consistent with move and delete and
  keeps the client cheap.
- **Alternatives considered**: Client-side expansion of all IDs — unbounded
  payloads and inconsistent with the move/delete pattern.

### D7 — Invite path batches DB writes, sends emails in bounded-parallel batches

- **Decision**: In `createBulkFileInvites`: fetch existing pending invites for
  the email + file IDs in one `findMany`; `createMany` the missing invitations
  (fresh unique tokens); `updateMany` the existing ones (permission + expiry);
  send emails with bounded concurrency (e.g. batches of 5-10 via `Promise.all`).
- **Rationale**: Turns per-file DB writes into three set-based statements;
  keeps the no-account edge case working within a predictable time; bounded
  concurrency avoids overwhelming the email provider.
- **Known residual risk**: at the 500-item cap, email-provider latency is the
  floor for the invite path (only used when the recipient has no account). If
  the 5s budget must hold for 500 invites, email delivery should move to a
  background job — deferred (user requirement: no new infrastructure); flag in
  tasks.md and re-measure during implementation.
- **Measured (T032, 2026-08-15, dev env)**: bulk share to a no-account email at
  the 500-item cap completed in **~54.6s** (100 sequential waves of 5 concurrent
  Brevo sends ≈ 0.55s/wave). DB batching is not the bottleneck — the share part
  minus email is <5s; email-provider latency dominates 1:1 with invite count.
- **Decision (T032)**: **keep in-request email delivery** for this iteration —
  the requirement was no new infrastructure (D8), the response returns
  success (invites are created even if a send fails), and the 5s budget (SC-003)
  applies to the registered-recipient share path where this is not reached.
  Filed as follow-up: background email dispatch (queue/worker) when the
  no-account bulk-share UX needs to stay under 5s.

### D8 — No schema changes, no new indexes, no new infrastructure

- **Decision**: The fix is entirely query/flow restructuring. Existing unique
  constraints already back the ON CONFLICT upserts; `audit_log` is append-only
  with no unique key needed for `createMany`; the descendant CTE uses the
  existing `folder` index on `parentFolderId` via the self-join. Observability
  stays on the existing `withLogging` per-request duration logs
  (logger.ts:39-77) — already sufficient to verify SC-004 trends.
- **Rationale**: Minimal blast radius; satisfies "no unnecessary
  infrastructure". Verify during implementation with `bun prisma migrate
status` that no drift is introduced.

## 3. Open items carried into implementation (non-blocking)

- ~~Re-measure invite-path latency at 500 items after batching; decide whether to
  background email delivery (see D7).~~ **DONE (T032)**: ~54.6s at 500 invites
  in dev; decision = keep in-request delivery, filed follow-up for background
  dispatch.
- Confirm the shared constant name (`MAX_BULK_OPERATION_ITEMS`) and whether to
  alias `MAX_BULK_DELETE_FILES` to it during `/speckit.tasks`.
