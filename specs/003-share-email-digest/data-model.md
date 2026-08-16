# Data Model — Bulk Share Email Digest

**Feature**: `specs/003-share-email-digest` | **Date**: 2026-08-16
**Conclusion**: **No schema change.** This feature alters notification
behavior only; all persistence lives in existing tables
(`prisma/schema.prisma`). `bun prisma migrate status` must report no drift.

## Entities

### Invitation (unchanged — FR-004)

Per-file pending grant of access, **one row per shared file**, created in bulk.
Defined at `prisma/schema.prisma:254-276`.

| Field             | Type            | Notes                                               |
| ----------------- | --------------- | --------------------------------------------------- |
| `id`              | `uuid` PK       |                                                     |
| `email`           | `string`        | recipient, normalized (`normalizeEmail`)            |
| `resourceType`    | `string`        | `"FILE"` for this feature                           |
| `fileId`          | `uuid?`         | the single shared file                              |
| `groupId`         | `uuid?`         | `null` for file invites                             |
| `permission`      | `string`        | `read` \| `write`                                   |
| `token`           | `string` unique | generated per invite (`generateToken`)              |
| `status`          | `string`        | `PENDING` \| `ACCEPTED` \| `CANCELLED` \| `EXPIRED` |
| `invitedByUserId` | `uuid`          | sender                                              |
| `expiresAt`       | `datetime`      | `computeExpiry()` — unchanged expiry behavior       |

Creation rules in `createBulkFileInvites` (invitation-service.ts:210-323):

- Deduplicated ids (`new Set`), capped at `MAX_BULK_OPERATION_ITEMS = 500`.
- Missing ids / forbidden / not-available / owned-by-recipient files are
  excluded _before_ invite creation (share-service.ts:196-215) — only actually
  shared files become invites (FR-008 input).
- New invites → one `createManyAndReturn`; invites already `PENDING` → one
  `updateMany` refreshing `permission` + `expiresAt`. No per-file DB writes.

Validation rules (unchanged):

- Sharing with self → error `"You cannot share with yourself"` (400).
- `resourceType` is `"FILE"`, `fileId` set, `groupId` null.
- No state machine change; acceptance/expiry behavior untouched.

### Share Action (conceptual — no table)

The single bulk-share act the user submits; the digest corresponds to **one
action** (spec Assumptions). It is not persisted as a row: it is implicitly
materialized by the set of `Invitation` rows created/refreshed in one
`createBulkFileInvites` call plus the one `invite_digest_sent` audit row (D5).
No windowed coalescing — separate actions yield separate digests.

### AuditLog (one new action value — no schema change)

`action` is a free-form `String` (schema comment at `prisma/schema.prisma:161`,
not a DB enum), so no DDL is needed. New value used by this feature:

| action                     | fileId   | details                                                                                | when                                       |
| -------------------------- | -------- | -------------------------------------------------------------------------------------- | ------------------------------------------ |
| `invite_sent` (existing)   | the file | `"Created file-share invite to {email} for {label}"` — **reworded** from "Sent …" (D5) | per invite, batched in one `createMany`    |
| `invite_digest_sent` (new) | `null`   | `"Sent bulk-share digest email to {email}"`                                            | once per action with ≥1 invite, same batch |

Both rows are written in the single existing `auditLog.createMany`
(invitation-service.ts:307-314) — no additional round trip.

### Recipient (unchanged)

Identified by normalized email; no account at share time. Digest is sent only
when the recipient has **no** registered account (registered recipients get
permissions directly, no email — unchanged, share-service.ts:217-240). After
sign-up, `grantPendingInvitesForUser` (invitation-service.ts:399-463) grants
all pending invites regardless of whether the digest named them.

## State transitions

None introduced. `Invitation.status` lifecycle (`PENDING → ACCEPTED/CANCELLED/
EXPIRED`) is untouched. The digest email has no persisted state — best-effort
delivery (FR-007) leaves only the audit row as evidence.
