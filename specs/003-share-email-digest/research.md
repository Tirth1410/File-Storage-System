# Research — Bulk Share Email Digest

**Feature**: `specs/003-share-email-digest` | **Date**: 2026-08-16
**Inputs**: feature spec; code at `app/lib/invitation-service.ts`,
`app/lib/share-service.ts`, `app/lib/email-service.ts`,
`app/lib/email-templates/invite-email.ts`, `app/api/files/bulk-share/route.ts`,
`app/lib/bulk.ts`, `app/sign-up/page.tsx`.

## 1. Root-cause confirmation (from code)

| Flow                                | Hot spot                                                                                                    | Effect                                                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| bulk share → unregistered recipient | per-file `deliverInviteEmail` loop in `createBulkFileInvites`, invitation-service.ts:290-305 (Batches of 5) | 500 files → 500 `sendBrevoEmail` calls (~0.55 s each) → ~55 s request stall (SC-002) and 500 inbox emails (SC-001) |
| digest email semantics              | subject/body built per file from `resourceLabel`, email-service.ts:159-189 + invite-email.ts                | email names one file (violates FR-002/FR-005)                                                                      |

Everything else needed already exists and is reused unchanged:

- Invitations are created **in bulk** via `prisma.invitation.createManyAndReturn`
  with `generateToken()`/`computeExpiry()` (invitation-service.ts:256-279) —
  FR-004 per-file records are already in place (spec 002 work).
- Re-sharing already refreshes existing pending invites via `updateMany`
  (invitation-service.ts:274-279) and only ever runs per **action**
  (`bulkShareWithUser` is called once per request) — so one digest per call
  automatically satisfies FR-006 (one new email per action, no per-file
  re-sends, no windowed coalescing).
- Audit rows are already batched in one `auditLog.createMany`
  (invitation-service.ts:307-314).
- The sign-up path is already email-parameter driven:
  `signUpUrl = ${APP_URL}/sign-up?email=…` (invitation-service.ts:111), and
  `app/sign-up/page.tsx:25-31` pre-fills the email field from that query param —
  FR-003's "same sign-up/acceptance path" works unchanged.
- Best-effort delivery is already the contract: `sendBrevoEmail` returns
  `{ success, error }` and never throws (email-service.ts:59-126); the share is
  never rolled back on email failure.

## 2. Decisions

### D1 — Replace the per-file email loop with one digest send inside `createBulkFileInvites`

- **Decision**: Delete the Batches-of-5 `deliverInviteEmail` loop
  (invitation-service.ts:290-305). After invitations are created/refreshed, if
  `invites.length > 0`, send exactly **one** digest email via a new
  `deliverInviteDigestEmail` helper. Assign the digest's success boolean to
  every `invited[].emailSent` entry so the API response shape is preserved.
- **Rationale**: The invite-path entry point is `createBulkFileInvites`,
  called once per bulk-share action from `shareService.bulkShareWithUser`
  (share-service.ts:242). Putting the single send here guarantees "one email
  per action" for any file count (FR-001, US1/US3), keeps per-file invitation
  creation (FR-004) and batching untouched, and naturally satisfies FR-008
  (`invites.length > 0` guard — a fully-skipped action sends nothing).
- **Alternatives considered**:
  - Move the send up into `shareService.bulkShareWithUser` — duplicates the
    recipient/signup logic already owned by the invitation service and leaks
    email concerns into the share service; rejected (modularity, G3).
  - Keep per-file emails for small counts, digest only above a threshold —
    violates FR-001 (exactly one) and US3 (a 1-file bulk share collapses to
    one email); rejected.

### D2 — New generic digest template with **no** file names and **no** count

- **Decision**: Add `app/lib/email-templates/invite-digest-email.ts` with a
  parallel `generateInviteDigestEmailHtml` / `generateInviteDigestEmailText`.
  Content: header "Files have been shared with you", body
  "`{inviterName}` shared files with you on Vault.", one "Join Vault" CTA →
  `signUpUrl` (same as today), optional expiry line. Subject:
  "Files have been shared with you on Vault". No `resourceLabel`, no count, no
  per-file names, no singular/plural logic.
- **Rationale**: FR-002 (no enumeration/names), FR-005 (no count), US3-SC2
  (worded correctly at any count). Reuses the existing visual shell from
  `invite-email.ts` (logo, CTA button, expiry footer) so it reads as the same
  brand.
- **Alternatives considered**:
  - Reuse `generateInviteEmailHtml` with a generic `resourceLabel` like "a
    file" — still renders the per-file template and "a file" reads wrong for
    multi-file shares; a distinct template is cleaner (G4).
  - Mention the count ("N files were shared") — spec explicitly rejects the
    count (FR-005, checklist note "Option B"); rejected.

### D3 — Keep the existing single-file/group/resend email template unchanged

- **Decision**: `createFileInvite` (per-file share UI), `createGroupInvite`,
  and `resendInvite` keep calling `deliverInviteEmail` → `sendInviteEmailService`
  with the per-file/group template. Only the **bulk file-share** path emits the
  digest.
- **Rationale**: Spec scope is the bulk-share notification behavior
  (Assumptions: "a change to the email notification behavior only"). A
  single-file share in the bulk UI still goes through `createBulkFileInvites`
  and therefore receives one digest email (US3). The dedicated per-file share
  UI intentionally names the one file — that is desirable and out of scope.
- **Alternatives considered**: Route every invite through the digest —
  regresses the single-file UX (loses the file name) and touches group/resend
  flows the spec does not mention; rejected.

### D4 — Preserve `emailSent` semantics on the API response

- **Decision**: `invited` entries keep `{ fileId, emailSent, inviteId }`; set
  `emailSent = digestResult.success` for every entry (the one email represents
  the whole action). No shape change to `BulkShareWithUserResult` or the HTTP
  response.
- **Rationale**: Spec Assumption: "no changes to the bulk-share API contract".
  The boolean already means "the notification for this invite was attempted";
  with a digest it is the same boolean for all rows.
- **Alternatives considered**: New per-action `digestSent` field / omitting
  `emailSent` — breaks the documented contract; rejected.

### D5 — Audit trail: reword per-file rows + one digest row, same batch

- **Decision**: Keep the single `auditLog.createMany` (invitation-service.ts:307)
  but (a) reword each per-file row's `details` from "Sent file-share invite …"
  to "Created file-share invite …" (records the invitation, not the email) and
  (b) append one digest row per action, e.g.
  `{ action: "invite_digest_sent", fileId: null, details: "Sent bulk-share digest email to {email}" }`.
  Still one batched statement — no extra round trips.
- **Rationale**: Per-file rows no longer correspond to per-file emails; the
  reword keeps the audit log truthful (G1). A single digest row preserves
  delivery observability per action.
- **Alternatives considered**: Drop per-file audit rows — loses the audit of
  which invites were created; rejected. One digest row _replacing_ the batch —
  same round trip, less detail; keep both in one createMany.

### D6 — Send inline, no background queue

- **Decision**: Perform the single Brevo call inline in the request path, same
  as the existing single-file share (`createFileInvite` → `deliverInviteEmail`
  inline). No job/queue system is added.
- **Rationale**: The problem is **500** calls, not **1** call. One ~0.5 s
  call inline is the established precedent and keeps SC-002 (a few seconds)
  comfortably satisfied without new infrastructure.
- **Alternatives considered**: Background worker/queue (BullMQ, Vercel cron,
  outbox table) — no such infra exists in the repo; adding it for a single
  email per action is disproportionate to the feature and contradicts the
  "notification-behavior-only" scope; rejected and noted as a future option if
  per-action latency becomes a goal.

## 3. Open items

None — all unknowns resolved above; the spec was free of `[NEEDS
CLARIFICATION]` markers (checklist pass).

## 4. Risks & mitigations

- **Digest failure → all `emailSent` false but share succeeds**: intended
  (FR-007); sender UI already treats `emailSent: false` as best-effort.
- **Audit wording change**: no consumer asserts the `invite_sent` detail text;
  existing tests only assert row counts (share-service.test.ts:198-199).
- **Email deliverability of a generic no-name email**: no user data or links
  change beyond wording; template reuses the verified Brevo sender.
