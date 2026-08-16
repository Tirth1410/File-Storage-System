# Data Model — Bulk Operations Performance & Reliability Fix

**Feature**: `specs/002-bulk-ops-performance` | **Date**: 2026-08-15

**Scope**: No schema changes, no migrations, no new tables, no new indexes.
This document describes the existing entities the bulk operations read/write and
the invariants the optimization relies on. Source of truth:
`prisma/schema.prisma` (PostgreSQL via Supabase).

## Entities involved

### Folder (`folder`)

- `id` (uuid, PK), `name`, `ownerUserId`, `parentFolderId` (uuid, nullable,
  self-relation "FolderTree", `onDelete: SetNull`)
- `@@unique([ownerUserId, parentFolderId, name])` — used by the move
  duplicate-name check.
- Role in bulk move: participant (moved) and target (destination). The
  recursive CTE walks this self-relation to detect moving a folder into its own
  subtree.

### File (`file`)

- `id` (uuid, PK), `ownerUserId`, `folderId` (nullable), `status`
  (`uploading | available | failed | deleted`), `visibility`, `sizeBytes`,
  `objectKey`, `originalName`
- Role: the unit of move and share operations. Move writes `folderId`;
  eligibility requires `ownerUserId == caller` (or admin) and
  `status == "available"`.
- No unique constraint on `(folderId)` — duplicates in a folder are allowed for
  files (only folders have the name-uniqueness constraint).

### GroupFile (`group_file`) — target of bulk group share

- `id` (uuid, PK), `groupId`, `fileId`, `sharedByUserId`, `allowPreview`,
  `allowDownload`, `isActive`, timestamps
- `@@unique([groupId, fileId])` — the conflict target for the set-based
  `INSERT ... ON CONFLICT (group_id, file_id) DO UPDATE` upsert (research D1).

### FilePermission (`file_permission`) — target of bulk user share

- `id` (uuid, PK), `fileId`, `userId`, `permission` (`read | write`)
- `@@unique([fileId, userId])` — the conflict target for the set-based
  `INSERT ... ON CONFLICT (file_id, user_id) DO UPDATE` upsert (research D1).

### Invitation (`invitation`) — no-account share path

- `id` (uuid, PK), `email`, `resourceType` (`FILE | GROUP`), `fileId`
  (nullable), `groupId` (nullable), `permission`, `token` (unique), `status`
  (`PENDING | ACCEPTED | CANCELLED | EXPIRED`), `invitedByUserId`, `expiresAt`
- No unique constraint on `(email, fileId)`; `token` is unique per row. Batching
  (research D7) therefore fetches existing PENDING rows by email + file IDs in
  one query, then `createMany` for the missing rows (fresh tokens) and
  `updateMany` for existing ones.

### AuditLog (`audit_log`) — outcome records

- `id` (uuid, PK), `userId`, `action`, `fileId` (nullable), `folderId`
  (nullable), `details`, `createdAt`
- Append-only; no unique keys. Batched via `createMany` in one statement
  (research D2). Actions written by bulk flows: `file_moved`, `folder_moved`,
  `file_shared`, `group_file_shared`, `invite_sent`.

## Relational overview (bulk flows)

```text
User 1──N Folder (ownerUserId)             User 1──N File (ownerUserId)
Folder N──1 Folder (parentFolderId)        File N──1 Folder (folderId)
GroupFile (groupId, fileId)                FilePermission (fileId, userId)
  N:1 Group, N:1 File, N:1 User              N:1 File, N:1 User
Invitation (email, fileId?, groupId?)      AuditLog (userId, fileId?, folderId?)
```

## State transitions touched by this feature

| Entity         | Transition                                                          | Where                        |
| -------------- | ------------------------------------------------------------------- | ---------------------------- |
| File           | `folderId` set to target folder (no status change)                  | bulk move `updateMany`       |
| Folder         | `parentFolderId` set to target folder (or null = root)              | bulk move `updateMany`       |
| GroupFile      | upsert: create or update `allowPreview/allowDownload/isActive`      | bulk group share ON CONFLICT |
| FilePermission | upsert: create or update `permission`                               | bulk user share ON CONFLICT  |
| Invitation     | create PENDING or update `permission/expiresAt` on existing PENDING | no-account share path        |
| AuditLog       | append rows for each moved/shared/invited item                      | `createMany` in same tx      |

No new transitions, entities, or constraints are introduced.

## Validation rules enforced (unchanged, preserved by the fix)

- Move/share eligibility: `file.ownerUserId == userId` or caller is admin
  (folders likewise); `status == "available"` for files.
- Move rejection: target inside a selected folder's own subtree; duplicate
  folder name in target; already-in-target items reported as skipped.
- Group share: caller must be a group member (or system admin).
- User share: cannot share with self; recipient-owned files skipped; recipient
  without an account → invitation flow.
- Cap: requests resolving to > 500 items are rejected (FR-004).

## Data-integrity notes

- Audit entries become atomic with the state change (written in the same
  transaction); a failed operation leaves no audit trail, a committed one has an
  entry for every item (SC-006).
- The ON CONFLICT upserts preserve the "no duplicate shares" rule (FR-010)
  because they key on the existing unique constraints.
