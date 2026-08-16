# Research: Bulk Move & Bulk Share

**Phase 0 output** — resolves technical unknowns and captures design decisions
from codebase investigation (2026-08-15).

## Decision 1 — Bulk move is already implemented; treat as validate

- **Decision**: Bulk move in the "My Files" tab is complete. The plan's scope for
  move is verification end-to-end, not new implementation.
- **Rationale**: Code audit found the full path already wired:
  - UI: `SelectionToolbar` ("Move (N)" button) + dashboard `submitBulkMove`
    (`app/dashboard/page.tsx:406`) with selection mode, select-all, deselected
    exclusions.
  - API: `POST /api/files/bulk-move` (`app/api/files/bulk-move/route.ts`) with
    `withLogging`, `getRequestUser`, 401/400/403/404/409/500 mapping.
  - Service: `folderService.bulkMove` (`app/lib/folder-service.ts:433`) returns
    `BulkMoveResult` buckets: `moved`, `skipped`, `forbidden`, `notFound`,
    `failed`; handles `selectAll`, `excludeIds`, folder-cycle and target-folder
    ownership checks, and status="available" gating.
- **Alternatives considered**: Re-implementing bulk move was rejected — existing
  code already satisfies FR-001/FR-002/FR-007/FR-009/FR-011/FR-012.

## Decision 2 — Reuse the existing share modal for bulk (per user directive)

- **Decision**: Adapt the existing `ShareModal` + `FileAccessManager` so they can
  run in bulk mode (a list of file IDs instead of one file). The users and groups
  tabs are reused as-is; the links tab is hidden in bulk mode.
- **Rationale**: Share links are inherently per-file (token + expiry stored on the
  link row) and the spec excludes them from bulk (Assumption). Users/groups
  sharing map cleanly to `FilePermission`/`GroupFile` rows and already carry the
  needed inputs (email + permission; group + preview/download toggles).
- **Alternatives considered**: A separate bulk-only modal was rejected — it would
  duplicate the users/groups share UI and violate the "reuse the existing share
  modal" directive and the Modularity principle.

## Decision 3 — Unknown email in bulk share follows the existing invite flow

- **Decision**: When the recipient email has no account, reuse the existing
  behavior of `/api/files/[id]/permissions` → `invitationService.createFileInvite`:
  create a PENDING `Invitation` per file and send the invite email. The bulk
  result reports those as `invites` (not failures).
- **Rationale**: This is exactly what the single-file share modal does today
  (`app/lib/invitation-service.ts:150`). Since bulk reuses the modal and its
  behavior (Decision 2), behavior must match or users see inconsistent outcomes.
- **Impact on spec**: Spec User Story 2 acceptance 3 says an unknown email is
  reported "unresolved". This deviates from existing behavior. Recommend updating
  that acceptance scenario to: unknown email → pending invites created and
  reported as such. Flag for `/speckit.tasks` and implementation confirmation.
- **Alternatives considered**: Hard-rejecting unknown emails (spec text) would
  diverge from the existing single-file flow and block new-user onboarding via
  share invites.

## Decision 4 — Self-share and owner-exclusion rules

- **Decision**: Bulk share by email reuses `createFileInvite`'s checks: throwing
  "You cannot share with yourself" for the caller's own email. Files owned by the
  recipient are excluded and reported in a `skipped` bucket (FR-010), since
  sharing a file with its owner is a no-op.
- **Rationale**: These rules already exist in `invitationService` /
  `shareService.addFilePermission`; reusing them keeps authorization consistent.
- **Alternatives considered**: Silently skipping owner files was rejected — the
  spec (FR-010) requires explicit reporting.

## Decision 5 — Group share reuses `shareFileWithGroup` semantics

- **Decision**: Bulk group share verifies (per spec + existing route) that the
  caller is a member of the group or a system admin, then upserts `GroupFile`
  rows (composite key `groupId_fileId`) with uniform `allowPreview` /
  `allowDownload`, exactly like `groupService.shareFileWithGroup`
  (`app/lib/group-service.ts:381`).
- **Rationale**: `shareFileWithGroup` already implements FR-005/FR-006/FR-008
  semantics (upsert, no duplicates, uniform settings). The bulk variant loops the
  file set but reuses the same validation and audit logging
  (`action: "group_file_shared"`).
- **Alternatives considered**: A new GroupFile batch API was rejected — the
  existing method's checks (file owner, group membership, system admin) must run
  per-file anyway, and the audit trail needs one entry per file.

## Decision 6 — Performance: batch reads + transactional writes (no N+1)

- **Decision**: For ≤50 files, resolve all file rows in ONE `findMany` (`id in`),
  resolve the recipient/group membership in one query each, then run the upserts
  inside a single `prisma.$transaction` (parallel `Promise.all` inside the tx),
  collecting per-file results into the response buckets.
- **Rationale**: The constitution's Efficiency & Optimization principle and
  "Performance & Efficiency Standards" forbid N+1 and unbounded work. A batch of
  50 sequential upserts would be 50 round trips; a batched read + transaction
  keeps it to ~4 round trips regardless of selection size.
- **Alternatives considered**: Raw `createMany({ skipDuplicates: true })` +
  `updateMany` — fewer statements but loses per-file success/failure reporting
  (FR-007/FR-011) and per-file audit rows; rejected for correctness of outcomes.

## Decision 7 — Default permission is "read" (spec default)

- **Decision**: `permission` defaults to `"read"` on the bulk-share endpoint;
  `"write"` is explicit. Only `"read" | "write"` are accepted (mirrors
  `createFileInvite`'s safe-permission coercion).
- **Rationale**: Spec assumption states the default; the single-file flow
  already coerces to read/write.

## Decision 8 — No schema changes

- **Decision**: No Prisma migrations. `FilePermission`, `GroupFile`, `Invitation`,
  `Group`, `GroupMember` already model everything bulk share needs.
- **Rationale**: Code audit of the generated client and schema confirmed the
  composite keys (`fileId_userId`, `groupId_fileId`) and fields
  (`permission`, `allowPreview`, `allowDownload`, `isActive`, `sharedByUserId`)
  all exist.

## Unresolved / Open items

- Spec Story 2 acceptance 3 wording (unknown email) conflicts with Decision 3 —
  update the spec during `/speckit.tasks` if the team agrees with the invite-flow
  behavior; otherwise hard-reject. This is a spec-text tweak, not an
  implementation gate.
