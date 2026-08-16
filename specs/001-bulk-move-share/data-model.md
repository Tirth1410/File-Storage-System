# Data Model: Bulk Move & Bulk Share

**Phase 1 output** — entities touched by the feature. No new tables; all entities
are existing Prisma models. Field lists below are the ones relevant to this
feature (not exhaustive schemas).

## File

Existing record representing one stored document.

| Field         | Type                | Role in this feature                                                    |
| ------------- | ------------------- | ----------------------------------------------------------------------- |
| `id`          | string (PK)         | Selected item; shares are created per file                              |
| `ownerUserId` | FK → User           | Owner authorization (FR-009); owner-exclusion for share (FR-010)        |
| `folderId`    | FK → Folder \| null | Current location; changed by bulk move (target folder)                  |
| `status`      | enum                | MUST be `"available"` to be eligible for move/share; others → `skipped` |

State transitions: `folderId` changes on move (FR-002). `status` is never
changed by this feature.

## Folder

Existing record representing a user-owned container.

| Field            | Type                | Role in this feature                  |
| ---------------- | ------------------- | ------------------------------------- |
| `id`             | string (PK)         | Move destination / source             |
| `ownerUserId`    | FK → User           | Target-folder ownership check on move |
| `parentFolderId` | FK → Folder \| null | Enables cycle detection (FR-012)      |

State transitions: folders move but are NOT share targets in v1 (assumption).
Cycle prevention: moving a folder into itself or a descendant is rejected (FR-012).

## FilePermission

Existing record granting a user access to a file.

| Field           | Type                | Role in this feature                                  |
| --------------- | ------------------- | ----------------------------------------------------- |
| `fileId_userId` | composite PK        | One row per (file, user) — no duplicates (FR-008)     |
| `permission`    | `"read" \| "write"` | Uniform level applied to every selected file (FR-005) |

State transitions: bulk share by email **upserts** this row — created if absent,
permission updated if present (FR-008). Owning the file excludes creation
(FR-010). Removed only via existing per-file manage flow, out of scope here.

## GroupFile

Existing record granting a group access to a file.

| Field            | Type         | Role in this feature                               |
| ---------------- | ------------ | -------------------------------------------------- |
| `groupId_fileId` | composite PK | One row per (group, file) — no duplicates (FR-008) |
| `allowPreview`   | boolean      | Applied uniformly to all selected files (FR-006)   |
| `allowDownload`  | boolean      | Applied uniformly to all selected files (FR-006)   |
| `isActive`       | boolean      | Set true on share                                  |
| `sharedByUserId` | FK → User    | The caller                                         |

State transitions: bulk group share **upserts** this row with uniform toggles
(FR-006, FR-008).

## Invitation

Existing record for a pending share to an email with no account (Decision 3).

| Field          | Type                | Role in this feature                                                               |
| -------------- | ------------------- | ---------------------------------------------------------------------------------- |
| `resourceType` | `"FILE" \| "GROUP"` | `"FILE"` for bulk share by email                                                   |
| `fileId`       | FK → File           | Per-file invite (one per selected file for an unknown email)                       |
| `email`        | string              | Recipient                                                                          |
| `permission`   | string              | `"read" \| "write"`                                                                |
| `status`       | `PENDING`           | Created by bulk share; honored on sign-up by existing `grantPendingInvitesForUser` |

## User & Group (reference only)

- **User**: `id`, `email` (unique), `role` (`"admin"` unlocks admin bypass). The
  caller is resolved per request via `getRequestUser`.
- **Group**: `id`, `name`. **GroupMember**: `groupId_userId` composite PK, `role`
  (`OWNER`/`ADMIN`/`MEMBER`) — membership is required to share a file with a
  group (unless system admin).

## Validation rules (from spec requirements)

- Auth: caller MUST be authenticated (401); MUST own each file or be admin (403).
- At least one file id MUST be present (400).
- Email recipient: normalized (trim/lowercase); MUST NOT be the caller's own
  email; must exist → `FilePermission`, else → `Invitation`.
- Group recipient: `groupId` MUST be provided and caller MUST be a member or
  admin (403); group MUST exist (404).
- Permission MUST be `"read" | "write"`; default `"read"`.
- Items with `status != "available"` are reported as `skipped`, never silently
  dropped (SC-003).
- Partial failures MUST NOT roll back successful items (FR-011).

## Operation scope (per bulk action)

| Action                | Target          | Creates/Updates                                               | Eligibility                                     |
| --------------------- | --------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| Bulk move (validate)  | files + folders | `File.folderId`, `Folder.parentFolderId`                      | `status == "available"`                         |
| Bulk share by email   | files           | `FilePermission` (user exists) or `Invitation` (user missing) | `status == "available"`, not owned by recipient |
| Bulk share with group | files           | `GroupFile`                                                   | `status == "available"`                         |
