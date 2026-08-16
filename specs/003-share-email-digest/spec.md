# Feature Specification: Bulk Share Email Digest

**Feature Branch**: `003-share-email-digest`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "We have to optimize this. Let's say user shares 500 files, then we cannot share 500 emails to the user. Instead we can send a single email informing files are shared with you. No need to mention details about every single file, I am not sure to mention the counts of files as well."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - One Notification Per Bulk Share (Priority: P1)

A user bulk-shares many files with someone who doesn't yet have an account. The recipient receives **one** notification email for the whole bulk-share action, not one email per file.

**Why this priority**: This is the core of the feature — it eliminates email spam at scale (today, sharing 500 files sends 500 emails, which also stalls the request for ~55 seconds). This is the primary problem the feature exists to solve.

**Independent Test**: Can be fully tested by bulk-sharing 500 files to a single unregistered email address and verifying exactly 1 notification email is delivered.

**Acceptance Scenarios**:

1. **Given** a recipient email address with no account, **When** the sender bulk-shares 500 files to it in one action, **Then** exactly one notification email is delivered (not 500).
2. **Given** a bulk share of 3 files to an unregistered email, **When** the action completes, **Then** the recipient receives exactly one email.
3. **Given** the notification email, **When** the recipient opens it, **Then** it does not list or name each individual shared file.
4. **Given** the bulk share completes, **When** the recipient later creates an account, **Then** all 500 files are available to accept as pending shares (no file is lost).

---

### User Story 2 - Bulk Share Completes Quickly Regardless of File Count (Priority: P1)

Bulk sharing a large number of files completes in a short, predictable time instead of scaling with the number of files.

**Why this priority**: The email count is the dominant driver of bulk-share latency today (~0.55s per email). Removing per-file emails makes completion time effectively independent of file count.

**Independent Test**: Can be tested by timing a 500-file bulk share and observing it completes in seconds rather than tens of seconds.

**Acceptance Scenarios**:

1. **Given** a 500-file bulk share to an unregistered recipient, **When** it is submitted, **Then** the operation completes within a few seconds.
2. **Given** bulk shares of 10 files and 500 files to unregistered recipients, **When** both complete, **Then** the completion time is comparable (does not scale 50× with file count).

---

### User Story 3 - Single-File Share Still Notifies (Priority: P3)

Sharing a single file to an unregistered recipient still sends a notification email (the digest collapses to one email, which is the same as today).

**Why this priority**: Preserves existing behavior for the common single-file case; the digest format must read naturally at a count of one.

**Independent Test**: Can be tested by sharing one file and confirming one notification email is delivered.

**Acceptance Scenarios**:

1. **Given** a single file shared with an unregistered recipient, **When** the share completes, **Then** exactly one notification email is delivered.
2. **Given** the digest email for a one-file share, **When** it is opened, **Then** it is worded correctly regardless of file count (no singular/plural issues, since the count is not mentioned).

---

### User Story 4 - Re-Sharing Does Not Re-Spam (Priority: P2)

When a sender shares more files with a recipient who already has pending invites from them, the recipient receives one email for the new action, not one per file (including previously pending ones).

**Why this priority**: Today re-sharing re-emails every file, including ones already pending. The digest must produce one email per action to keep the fix consistent.

**Independent Test**: Can be tested by sharing 100 files, then sharing 50 more to the same recipient, and verifying the recipient receives exactly 2 emails total (one per action).

**Acceptance Scenarios**:

1. **Given** a recipient with existing pending invites, **When** the sender bulk-shares additional files, **Then** the recipient receives exactly one new notification email for that action.
2. **Given** a re-share action, **When** it completes, **Then** the recipient can still accept all files (new and previously pending).

---

### Edge Cases

- Sharing exactly 1 file still sends exactly 1 email.
- Sharing 500 files sends exactly 1 email.
- The recipient email is invalid / email delivery fails: invites are still created and the share still succeeds (delivery is best-effort; failure is reported but does not roll back the share).
- The sender shares the same file set to two different recipient emails: each recipient gets their own single notification email.
- A bulk share where every file is skipped/forbidden and nothing is actually shared: no notification email is sent (nothing was shared).
- The recipient later signs up: all pending invites created by the bulk share are visible and acceptable, with no dependency on the digest email having listed them.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: When a user bulk-shares multiple files to a recipient, the system MUST deliver exactly one notification email per share action, regardless of the number of files shared.
- **FR-002**: The notification email MUST NOT enumerate, list, or name the individual shared files.
- **FR-003**: The notification email MUST inform the recipient that files were shared with them, and MUST include the same sign-up/acceptance path that exists today (single sign-up link; acceptance of the pending shares happens after the recipient has an account).
- **FR-004**: The system MUST continue to create one pending invitation record per shared file so every shared file remains individually acceptable by the recipient — the email digest does not replace per-file invitation records.
- **FR-005**: The notification email MUST NOT mention the number of files shared. It only states that files were shared with the recipient (e.g., "Files have been shared with you"), without a count or per-file details.
- **FR-006**: Re-sharing additional files to a recipient with existing pending invites MUST send exactly one new notification email for the new action (no per-file re-sends of pending files).
- **FR-007**: Email delivery MUST be best-effort: a delivery failure MUST NOT roll back or fail the share; invites are created regardless, and the outcome is reported to the sender.
- **FR-008**: If no files are actually shared in an action (all skipped, not found, or forbidden), the system MUST NOT send a notification email.

### Key Entities _(include if feature involves data)_

- **Invitation**: A per-file pending grant of access (one per shared file). Unchanged by this feature; created in bulk as today.
- **Share Action / Notification**: A single summary email representing one bulk-share action. The digest corresponds to one action, not one file.
- **Recipient**: The person the files are shared with; identified by email. Receives the digest when they have no account (registered recipients receive no notification email, unchanged).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Bulk-sharing 500 files to one unregistered recipient delivers exactly **1** notification email (previously 500).
- **SC-002**: A bulk share of 500 files completes in **under 10 seconds** (previously ~55 seconds), and completion time does not scale linearly with file count.
- **SC-003**: **100%** of files included in a bulk share remain individually acceptable by the recipient (no files lost from the share).
- **SC-004**: The notification email contains **zero** individual file names; a manual review of the delivered email confirms it does not list per-file details.
- **SC-005**: Re-sharing to the same recipient produces exactly **1** new email per action, regardless of how many pending invites already exist.

## Assumptions

- The digest applies only to the no-account invite path; registered recipients receive no notification email today and this does not change.
- One notification email is sent per share action; separate actions are **not** coalesced by a time window (a recipient may receive several digests from several actions — each is a single email). Windowed coalescing is out of scope for this feature.
- The single email keeps the same purpose as today's invite email: drive the recipient to create an account, where all pending shares become visible and acceptable. It does not need to link to each file.
- The digest email does not mention the number of files shared (decision: no count).
- The recipient counts files as "shared with you" even though they have not yet accepted; the email wording should reflect pending status without listing details.
- Per-file invitation records and their expiry behavior are unchanged.
- Best-effort delivery and the existing sign-up/acceptance flow are reused as-is.
- This is a change to the email notification behavior only — no changes to the bulk-share API contract, the selection/select-all flow, or the share permission model.
