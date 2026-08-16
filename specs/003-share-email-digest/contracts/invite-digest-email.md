# Contract — Bulk Share Digest Email Notification

**Feature**: `specs/003-share-email-digest` | **Date**: 2026-08-16
**Scope**: The externally visible notification this feature changes — the
Brevo transactional email a no-account recipient receives after a bulk share —
plus the guarantee that the bulk-share **HTTP API contract is unchanged**.

## 1. HTTP API — unchanged (no contract change)

`POST /api/files/bulk-share` (and its response shape `BulkShareWithUserResult`)
are **not** modified (spec Assumption). Per-item outcome fields
`shared` / `invites` / `skipped` / `notFound` / `forbidden` are preserved.

Semantics that stay true under the digest:

- `invites` still contains one entry per shared file with `{ fileId,
emailSent, inviteId }` (FR-004 — one pending invite per file).
- `emailSent` still means "the notification email for this share was
  attempted". Under the digest it is the **same boolean for every entry** of
  the action, equal to the single digest send's result (D4).
- `emailSent: false` on an otherwise-successful share is **not** an error and
  does not roll back anything (FR-007).

## 2. Digest email contract

Producer: `sendInviteDigestEmailService` (new, `app/lib/email-service.ts`),
reusing `sendBrevoEmail` (existing transport). Template:
`app/lib/email-templates/invite-digest-email.ts`.

| Attribute        | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| Recipient (`to`) | recipient email, normalized                                                 |
| Sender           | existing `EMAIL_FROM` / `parseSender` (unchanged)                           |
| Subject          | `Files have been shared with you on Vault`                                  |
| Tag (`tags`)     | `["invite_digest"]`                                                         |
| HTML             | `generateInviteDigestEmailHtml`                                             |
| Text             | `generateInviteDigestEmailText`                                             |
| Delivery         | best-effort; returns `SendEmailResult` (`{ success, error }`), never throws |

### Content rules (FR-002, FR-003, FR-005)

- **Must state** that files were shared with the recipient, e.g.
  `{inviterName} shared files with you on Vault.`
  (inviter name is allowed; it is not per-file data).
- **Must include** the exact existing sign-up/acceptance CTA and URL
  (`Join Vault` → `${APP_URL}/sign-up?email={recipient}`) — same path the
  per-file invite uses today; `app/sign-up/page.tsx:25-31` pre-fills the email.
- **Must NOT** enumerate, list, or name any shared file (zero file names —
  SC-004).
- **Must NOT** mention the number of files (FR-005; no singular/plural logic —
  US3-SC2).
- Optional expiry line mirrors the existing invite footer
  ("This invitation expires on {date}") — unchanged semantics.

### One-email guarantee (FR-001, FR-006, FR-008)

- Exactly **one** digest email is emitted per `createBulkFileInvites` call
  that creates/refreshes **at least one** invite.
- Re-sharing additional files to a recipient with existing pending invites is
  one new action → exactly one new digest (no per-file re-sends of pending
  invites; no time-window coalescing).
- Zero actually-shared files → zero invites → **no** digest email (FR-008).

### Non-contract surface (unchanged behavior, not this feature)

The single-file share UI (`createFileInvite`), group invites
(`createGroupInvite`), and invite resend (`resendInvite`) continue to use the
existing per-file/group `sendInviteEmailService` template (D3) — unchanged.

## 3. Example (illustrative, not exhaustive)

```
Subject: Files have been shared with you on Vault

Hi,

Tirth shared files with you on Vault.

Create a free account to accept and start accessing your shared files securely.

[ Join Vault ]  → https://vault.app/sign-up?email=recipient@example.com

This invitation expires on Aug 20, 2026. If the button doesn't work, copy
this link into your browser: https://vault.app/sign-up?email=recipient@example.com
```
