# Feature Specification: Bulk Operations Performance & Reliability Fix

**Feature Branch**: `002-bulk-ops-performance`

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "For the bulk operations there is some performance issue. They are very slow. 1. Move operation works, but takes 10-20 seconds. 2. Share operation didn't work, it gave error: Share with a Group — Invalid ... $transaction(shared.map((s)=>...groupFile.upsert( ... Transaction API error: A rollback cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms, however 5534 ms passed since the start of the transaction. Consider increasing the interactive transaction timeout or doing less work in the transaction."

## Clarifications

### Session 2026-08-15

- Q: At what selection size should the performance targets (move ≤3s, share ≤5s) be guaranteed — 50 or 100 items? → A: Superseded — "select all" on the dashboard selects every file the user owns, regardless of the current window, so bulk operations are NOT limited to 100. Performance and reliability must hold at the user's full library scale.
- Q: How should bulk share be made efficient at that unbounded scale? → A: Following the existing bulk-delete precedent: use set-based Postgres operations (single bulk insert/update statements, batched audit writes in one transaction) rather than per-item operations.
- Q: How many items should a single bulk share request be allowed to include, given that "select all" can select more than 100 files? → A: 500 items per request, matching the existing bulk-delete limit. All bulk operations are capped at 500 items per request, and larger requests are rejected with a clear error before any processing.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Bulk Move Completes Quickly (Priority: P1)

A user in the "My Files" tab selects files and folders — including "select all", which selects their entire library regardless of what the current window shows — and moves them into a destination folder. Today the action works but takes 10-20 seconds, so the user stares at a spinner. After this fix, the same action completes in a few seconds so the user can continue organizing without waiting.

**Why this priority**: Move is the most-used bulk action and it already fails the "feels responsive" bar. This is the primary complaint.

**Independent Test**: Can be fully tested by selecting 500 items (the maximum), moving them, and measuring the time from clicking "Move" until the file list refreshes — must be well under the current 10-20 seconds.

**Acceptance Scenarios**:

1. **Given** 500 mixed files and folders selected in "My Files", **When** the user confirms a bulk move to a target folder, **Then** the operation completes in under 3 seconds and all 500 items appear in the target folder.
2. **Given** the user uses "select all" and the selection spans their entire library, **When** they confirm a bulk move, **Then** the operation completes within the target time and every eligible item is relocated.
3. **Given** the user selects 20 items and moves them, **When** the operation finishes, **Then** the confirmation message still shows the correct moved/skipped counts exactly as before.
4. **Given** a bulk move includes a folder with a deep descendant tree, **When** the move completes, **Then** the folder is still correctly rejected if the target is inside its own tree, without materially adding to the total time.

---

### User Story 2 - Bulk Share No Longer Fails (Priority: P1)

A user selects files — including via "select all", which selects their entire library — and shares them with a group (or another user). Today the group share can fail outright with a timeout error and no files get shared. After this fix, both bulk share flows complete successfully and promptly at full-library scale, and the outcome is reported as before.

**Why this priority**: A feature that errors out entirely is worse than a slow feature — the user gets nothing for their effort. This is the blocking defect.

**Independent Test**: Can be fully tested by selecting 500 files (the maximum) and sharing them with a group, confirming the operation completes with a success message and every eligible file is accessible to the group afterward.

**Acceptance Scenarios**:

1. **Given** 500 files selected and a group chosen with preview allowed and download disabled, **When** the user confirms the bulk share, **Then** the operation completes in under 5 seconds with no error and all 500 files are shared to the group with the chosen settings.
2. **Given** 500 files selected and a recipient email entered, **When** the user confirms, **Then** the operation completes in under 5 seconds with no error and all eligible files are shared at the chosen permission level.
3. **Given** the user uses "select all" so the selection spans their entire library, **When** they confirm a bulk share with a group or user, **Then** the operation completes within the target time and every eligible file is shared.
4. **Given** a mix of eligible, already-shared, and ineligible files in one selection, **When** the bulk share completes, **Then** the result reports shared/updated/skipped counts correctly and never fails the whole operation over one bad item.
5. **Given** the user repeats a bulk share to the same group, **When** it completes, **Then** no duplicate shares are created — existing ones are updated — and it completes within the target time.

---

### User Story 3 - Correctness and Audit Trail Preserved (Priority: P2)

Faster operations must not change what the system records or reports. Every moved, shared, or updated item still appears in the user's activity history with the same detail as today, and the per-item outcomes (moved, shared, skipped, forbidden, not found) are still reported accurately.

**Why this priority**: Performance gains that silently drop audit records or skip items would be a data-integrity regression. Correctness is a constraint on the fix, verified end-to-end.

**Independent Test**: Can be fully tested by performing one bulk move and one bulk share of 3+ items and comparing the resulting activity-history entries and outcome counts to the pre-fix behavior.

**Acceptance Scenarios**:

1. **Given** a bulk move of 5 files completes, **When** the user views their activity history, **Then** an entry exists for each of the 5 files with the same detail text as before.
2. **Given** a bulk share with a group completes, **When** the user views activity history, **Then** an entry exists for each shared file as before.
3. **Given** a selection containing ineligible items (unavailable, not owned, already in target), **When** the operation completes, **Then** each is still reported as skipped/forbidden with a reason, identical to current behavior.

---

### Edge Cases

- A selection at the 500-item maximum: the operation must still complete within the guaranteed targets and never time out or fail partway.
- "Select all" spans the user's entire library, which may exceed the 500-item maximum: the request is rejected with a clear message telling the user the selection is too large, rather than processing or failing partway.
- Concurrent bulk operations on overlapping files: the operation either completes or reports a clear failure — the user must never see a raw timeout/expired-transaction error.
- Moving a folder into itself or a descendant: still rejected, and the rejection check must not cause a disproportionate slowdown when several folders are moved at once.
- A file becomes unavailable between selection and confirmation: still reported as skipped, not silently dropped or failing the whole operation.
- Sharing to an email with no account: still creates pending invitations as today, within the target time.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A bulk move of up to 500 selected items MUST complete in under 3 seconds from user confirmation to the refreshed file list.
- **FR-002**: A bulk share with a group of up to 500 selected files MUST complete successfully in under 5 seconds without any transaction/expired-timeout error.
- **FR-003**: A bulk share with a user of up to 500 selected files MUST complete successfully in under 5 seconds without any transaction/expired-timeout error.
- **FR-004**: A single bulk request MUST NOT accept more than 500 items; the system MUST reject larger requests (including "select all" on a library exceeding the limit) with a clear error before any processing.
- **FR-005**: The total time for a bulk operation MUST scale predictably with selection size — completion time MUST NOT degrade disproportionately as the selection grows toward the 500-item maximum, and the operation MUST never fail due to internal time limits.
- **FR-006**: Bulk share MUST support the existing "select all" mode so a selection spanning the user's entire library is resolved and processed server-side in one request, matching bulk move and bulk delete.
- **FR-007**: Bulk move and bulk share MUST execute the state change as a single set-based operation (one bulk update/insert per affected table) rather than one operation per item, and MUST batch audit-trail writes into as few statements as possible.
- **FR-008**: The system MUST preserve the existing per-item outcome reporting (moved, shared, skipped, forbidden, not found, and reasons) for every bulk move and bulk share.
- **FR-009**: The system MUST preserve the existing audit trail: an activity-history entry with the same detail as today MUST be recorded for every moved, shared, or updated item.
- **FR-010**: The system MUST preserve all existing correctness rules — skipping unavailable items, forbidding non-owned items, rejecting folder-into-descendant moves, and never creating duplicate shares.
- **FR-011**: When a bulk operation cannot complete, the user MUST receive a clear, human-readable failure message — never a raw internal transaction error.

### Key Entities _(include if feature involves data)_

- **File**: A stored document owned by a user; the unit of move and share operations.
- **Folder**: A user-owned container for files; a participant in bulk move only.
- **FilePermission**: The record linking a file to a recipient user with a permission level; created or updated in bulk user shares.
- **GroupFile**: The record linking a file to a group with preview/download settings; created or updated in bulk group shares.
- **Audit log**: The activity-history record written for each moved, shared, or updated item; its completeness must be preserved by the fix.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A bulk move of up to 500 items completes in under 3 seconds (currently 10-20 seconds).
- **SC-002**: A bulk share with a group of up to 500 files completes successfully in under 5 seconds with zero failures (currently errors out for large selections).
- **SC-003**: A bulk share with a user of up to 500 files completes successfully in under 5 seconds with zero failures.
- **SC-004**: Completion time scales predictably with selection size — a 250-item operation completes in roughly half the time of a 500-item operation, with no disproportionate per-item slowdown.
- **SC-005**: "Select all" on a library of any size triggers a single bulk request; a library exceeding 500 items is rejected with a clear message, never processed or failed partway.
- **SC-006**: 100% of items that complete a bulk move or share produce an audit-history entry, and per-item outcomes are reported identically to pre-fix behavior.
- **SC-007**: No bulk operation ever surfaces a raw transaction/expired-timeout error to the user; all failures are reported as clear, actionable messages.

## Assumptions

- The performance targets are measured end-to-end from the user's perspective (confirmation click to refreshed UI) against the production environment, including its remote database latency.
- The maximum selectable size for a bulk operation is 500 items per request, aligned with the existing bulk-delete limit; "select all" can span the user's entire library and requests beyond the limit are rejected with a clear error.
- The fix must not change the user-facing behavior, messaging, or audit details that already work correctly — this is purely a performance and reliability repair.
- No new user-facing features are in scope; only the speed and reliability of existing bulk move and bulk share (user and group) operations.
- Any database-level changes required for performance (e.g., indexes) are permitted but must preserve existing behavior and be validated against the same quality gates as the code change.
