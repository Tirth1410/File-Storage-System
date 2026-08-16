# Feature Specification: Bulk Move & Bulk Share for Files

**Feature Branch**: `001-bulk-move-share`

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "We need to add the features of bulk move and bulk share for the files under my files tab for the user."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Bulk Move Files Into a Folder (Priority: P1)

A user browsing the "My Files" tab wants to organize multiple files at once. They enter selection mode, tick the files (and optionally folders) they want to relocate, choose "Move", pick a destination folder, and all selected items are relocated in one action without having to repeat the process per file.

**Why this priority**: Moving several files is the most common bulk organizational task; it delivers immediate value as the entry-point bulk action users reach for.

**Independent Test**: Can be fully tested by selecting 3+ files, moving them into a target folder, and confirming every selected item appears in the target and none remain in the source.

**Acceptance Scenarios**:

1. **Given** 5 files and 2 folders in "My Files", **When** the user selects all 7 and moves them into an empty folder, **Then** all 7 appear inside the target folder and the source folder is empty.
2. **Given** the user selects files and clicks "Move" without choosing a destination, **When** they cancel the destination picker, **Then** no item is moved and the selection is preserved.
3. **Given** a file that is currently unavailable (e.g., processing), **When** it is included in a bulk move, **Then** it is reported as skipped with a reason and the remaining files are moved.

---

### User Story 2 - Bulk Share Files With a User (Priority: P1)

A user wants to share several files with a colleague in one action. They enter selection mode, tick the files, choose "Share", enter the recipient's email address, pick a permission level, and confirm. The selected files are all shared with that recipient at the chosen permission level.

**Why this priority**: Sharing multiple files with one recipient (or one file with several) is the core new capability; individual sharing already exists, so bulk sharing is the primary gap.

**Independent Test**: Can be fully tested by selecting 3 files, sharing them with one email address, and confirming the recipient can access all 3 files at the chosen permission level.

**Acceptance Scenarios**:

1. **Given** 3 files selected in "My Files", **When** the user shares them with `colleague@example.com` at "read" permission, **Then** all 3 files are shared with that user at read level and the user is informed how many were shared.
2. **Given** 2 of the selected files are already shared with the recipient at a lower permission, **When** the user bulk-shares all selected files at "write", **Then** those 2 files are updated to write and the third is created with write, with no duplicate shares.
3. **Given** the user enters an email that has no account, **When** they confirm the bulk share, **Then** a pending `Invitation` is created per eligible file and the invite email is attempted for each, with the result reported as invites (not a failure) — matching the existing single-file share flow (see Decision 3 in `research.md`).

---

### User Story 3 - Bulk Share Files With a Group (Priority: P2)

A user wants to share a set of files with a team group. In selection mode they tick the files, choose "Share", pick a group, and set preview/download toggles. All selected files become accessible to every group member under those settings.

**Why this priority**: Group sharing reuses the existing group mechanism but is less frequent than one-off user shares, so it is a second slice.

**Independent Test**: Can be fully tested by sharing 2 files with a group the user belongs to and confirming group members can preview but not download both files.

**Acceptance Scenarios**:

1. **Given** 2 files selected and a group chosen with download disabled, **When** the user confirms, **Then** all group members can preview both files but cannot download either.
2. **Given** one selected file is already shared with the group, **When** the group is applied again, **Then** the existing share is updated to the new settings rather than duplicated.

---

### Edge Cases

- What happens when the user selects files from different folders and moves them? All selected items move to the single chosen destination, regardless of source.
- What happens when the destination folder is inside one of the selected folders being moved? The move is rejected for that folder to prevent cycles.
- What happens when the user tries to share files they no longer own or that were deleted mid-selection? Those items are reported as skipped/not found.
- How does the system handle a very large selection (e.g., 100+ files)? The operation completes and reports the outcome without failing partway through.
- What happens if the same recipient email is entered twice in one share action? A single share per file is created/updated; duplicates are ignored.
- What happens when the user selects only folders and opens bulk share? Folders are excluded from bulk share in v1; the share action applies to files only and explains if nothing is eligible.
- What happens if the bulk share permission picker is left empty? The default "read" permission is applied and the user is told so.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to select multiple files (and folders) in the "My Files" tab in a single selection mode.
- **FR-002**: Users MUST be able to move all selected items to a chosen destination folder in one action.
- **FR-003**: Users MUST be able to share all selected files with a single user (identified by email) in one action.
- **FR-004**: Users MUST be able to share all selected files with a single group in one action.
- **FR-005**: The bulk share action MUST apply one uniform permission level (read or write) to all selected files.
- **FR-006**: Where the share target is a group, preview and download toggles MUST apply uniformly to all selected files.
- **FR-007**: The system MUST report the per-item outcome of bulk move and bulk share actions (moved/shared count, skipped count, and reasons) to the user.
- **FR-008**: The system MUST NOT create duplicate shares when a file is already shared with a recipient or group; it MUST update the existing share instead.
- **FR-009**: Only the owner of the files (or an authorized administrator) MUST be able to bulk move or bulk share those files.
- **FR-010**: Bulk share MUST exclude files that the selected recipient already fully controls (i.e., files they own) and MUST report those exclusions.
- **FR-011**: A bulk operation over a partial failure (some items fail) MUST still succeed for the valid items and MUST clearly report the failures.
- **FR-012**: Bulk move MUST prevent moving a folder into itself or into one of its own descendants.
- **FR-013**: Bulk share MUST reuse the existing share dialog; a single share action targets one recipient (one email address or one group), applied to all selected files.

### Key Entities _(include if feature involves data)_

- **File**: A stored document owned by a user; the unit of sharing. Tracked per user, with an availability status that can make an item ineligible for bulk operations.
- **Folder**: A user-owned container for files; the destination and source of bulk moves. Folders participate in bulk move but not bulk share in v1.
- **FilePermission**: The record linking a file to a recipient (user) with a permission level (read/write); bulk share creates or updates these records.
- **User**: The owner or recipient. Owners authorize bulk operations; recipients gain access through granted permissions.
- **Group**: A named set of users; bulk share can grant a group access to selected files with preview/download settings.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can move up to 50 selected items into a destination folder in one action and correctly see all of them relocated.
- **SC-002**: A user can share up to 50 selected files with one recipient (user or group) in one action, and the recipient can access every one of them.
- **SC-003**: 100% of eligible selected items are moved or shared; ineligible items are reported with a reason and never silently dropped.
- **SC-004**: A bulk move or share of up to 50 items completes without the user losing their selection or their place in the file list.
- **SC-005**: No file is moved or shared for a user who is not the owner (or an authorized administrator), verified for every attempted operation.
- **SC-006**: Repeating a bulk share over already-shared files never creates duplicate permission records.

## Assumptions

- Bulk move for files and folders already exists in the "My Files" tab; this feature's scope is to validate/complete it end-to-end and add bulk share as the new capability.
- Bulk share applies to files only in v1; folders cannot be bulk-shared.
- Bulk share reuses the existing share dialog for single files: the same dialog, permission levels (read/write), and group preview/download toggles, applied to all selected files instead of one. It targets one recipient (a single email address or a single group) per action.
- Share links remain a per-file capability and are out of scope for bulk actions.
- The default permission for bulk share is "read"; the user can explicitly choose "write".
- Group preview/download toggles from the existing single-file share flow are reused and applied uniformly to every selected file.
- The existing authentication and ownership model is reused; no new roles are introduced.
- Files whose storage status is not "available" are treated as ineligible for bulk move and bulk share and are reported as skipped.
