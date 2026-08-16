---
description: "Task list template for feature implementation"
---

# Tasks: Bulk Move & Bulk Share

**Input**: Design documents from `/specs/001-bulk-move-share/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No automated test suite exists in this repo and none was requested in
the spec. Validation is via `quickstart.md` scenarios plus the quality gates
(`bun run lint`, `bun run typecheck`, `bun run build`).

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single Next.js project: `app/` at repository root (per plan.md structure)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the existing repo is ready; no project scaffolding needed.

- [x] T001 [P] Verify dev environment: `bun install` succeeds, `.env` has
      `DATABASE_URL` + `DIRECT_URL`, `bun prisma db push` + `bun prisma generate`
      run clean, `bun run db:seed` completes
- [x] T002 [P] Baseline quality gates: `bun run lint` and `bun run typecheck`
      pass on current HEAD before any feature changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared bulk-share UI infrastructure — MUST be complete before US2 and
US3 can be implemented. US1 (bulk move) is unaffected.

**⚠️ CRITICAL**: US2/US3 cannot be wired until the toolbar button and the
bulk-mode share modal exist.

- [x] T003 [P] Add `onBatchShare: () => void` prop and a "Share (N)" button (with
      Share icon) to `app/components/dashboard/SelectionToolbar.tsx`, shown next
      to Move/Delete when `selectedCount > 0`; style per existing button classes
- [x] T004 [P] Add bulk-mode support to `app/components/shared/ShareModal.tsx`:
      accept `fileIds: string[]` and `count: number` instead of a single `file`;
      header shows "Share {count} Files"; render `FileAccessManager` in bulk mode
- [x] T005 [P] Add bulk-mode support to `app/components/shared/FileAccessManager.tsx`:
      when given a file list, hide the Links tab, hide per-file management lists,
      show the Users and Groups share forms only, and call bulk submit callbacks
      (`onShareUser`, `onShareGroup`) instead of the single-file endpoints
- [x] T006 Wire bulk-share state in `app/dashboard/page.tsx`: `bulkShareOpen`
      state, open/close handlers, pass only selected _file_ ids (folders
      excluded) to the modal; if the selection contains no files, show an info
      message explaining folders are not shareable in v1 (spec edge case)

**Checkpoint**: Toolbar shows "Share (N)"; modal opens with the file count and
Users/Groups tabs. Submits are not functional until US2/US3 endpoints exist.

---

## Phase 3: User Story 1 - Bulk Move Files Into a Folder (Priority: P1) 🎯 MVP

**Goal**: Confirm the existing bulk-move flow works end-to-end for files and
folders, and fix any gaps against the spec.

**Independent Test**: Select 3+ files and a folder, move them into a target, and
confirm every item relocated with none left behind; a folder move into its own
descendant is rejected; canceling the destination picker preserves the selection
(quickstart Scenario 1).

### Implementation for User Story 1

- [x] T007 [US1] Audit the existing bulk-move path (`SelectionToolbar` →
      `submitBulkMove` in `app/dashboard/page.tsx` → `POST /api/files/bulk-move`
      → `folderService.bulkMove` in `app/lib/folder-service.ts`) against
      FR-001/FR-002/FR-007/FR-009/FR-011/FR-012 and the bulk-move contract in
      `contracts/bulk-move.md`; record any gaps (status gating, cycle rejection,
      ownership, bucket reporting)
- [x] T008 [US1] Fix confirmed gaps from T007 in `app/lib/folder-service.ts`
      and/or `app/dashboard/page.tsx` (e.g., non-available files reported in
      `skipped`, cycle error surfaced, forbidden items reported)
- [x] T009 [US1] Run quickstart Scenario 1 end-to-end in `bun run dev`: multi-item
      move, folder-cycle rejection, cancel-preserves-selection; confirm all pass

**Checkpoint**: Bulk move is verified against the spec and MVP is demonstrable.

---

## Phase 4: User Story 2 - Bulk Share Files With a User (Priority: P1)

**Goal**: Share all selected files with one recipient by email at a uniform
permission level, reusing the existing invite flow for unknown emails.

**Independent Test**: Select 3 files, share them with an existing user at "read",
and confirm the recipient sees all 3 at read level; re-sharing at "write" updates
the same permission rows (no duplicates); an unknown email creates pending
invites rather than failing (quickstart Scenarios 2 & 3).

### Implementation for User Story 2

- [x] T010 [P] [US2] Add `bulkShareWithUser` to `app/lib/share-service.ts`:
      batch-load files with one `findMany` (`id in`), per-file ownership check
      (owner or admin), exclude recipient-owned and non-available files into
      `skipped` with reasons; existing user → `FilePermission` upsert at the
      permission; unknown email → PENDING `Invitation` per file + invite email
      (reuse `invitationService.createFileInvite` logic); self-share rejected;
      all writes in a single `prisma.$transaction`; return
      `{ shared, invites, skipped, notFound, forbidden }` per
      `contracts/bulk-share.md`; audit each share
- [x] T011 [US2] Create `POST` handler in `app/api/files/bulk-share/route.ts`
      using `withLogging` + `getRequestUser` (mirror `bulk-move/route.ts`):
      validate `fileIds` ≥ 1, `email` required, `permission` coerced to
      `read | write` (default `read`); map errors 401/400/403/500; return bucket
      result
- [x] T012 [US2] Wire the bulk Users-form submit in
      `app/components/shared/FileAccessManager.tsx` (bulk mode) to
      `POST /api/files/bulk-share`, sending `{ fileIds, email, permission }`;
      render the result summary (shared / invites / skipped) in the modal
- [x] T013 [US2] Run quickstart Scenarios 2 & 3 in `bun run dev`: existing-user
      share, write re-share with no duplicates, unknown-email invite flow

**Checkpoint**: Bulk share by email works independently (US1 unaffected).

---

## Phase 5: User Story 3 - Bulk Share Files With a Group (Priority: P2)

**Goal**: Share all selected files with one group at uniform preview/download
settings, reusing `shareFileWithGroup` semantics.

**Independent Test**: Share 2 files with a group the user belongs to with
download disabled; a group member can preview but not download either; repeating
the share updates the same `GroupFile` rows (no duplicates) (quickstart
Scenario 4).

### Implementation for User Story 3

- [x] T014 [P] [US3] Add `bulkShareWithGroup` to `app/lib/group-service.ts`:
      batch-load files, per-file ownership check, verify caller is a group member
      or system admin, upsert `GroupFile` (`groupId_fileId`) per file with
      uniform `allowPreview`/`allowDownload` + `isActive: true`, audit
      `action: "group_file_shared"` per file, all writes in a single
      `prisma.$transaction`; return
      `{ shared, skipped, notFound, forbidden }` per `contracts/bulk-share-group.md`
- [x] T015 [US3] Create `POST` handler in
      `app/api/files/bulk-share/group/route.ts` using `withLogging` +
      `getRequestUser`: validate `fileIds` ≥ 1 and `groupId` required; map errors
      401/400/403/404/500; return bucket result
- [x] T016 [US3] Wire the bulk Groups-form submit in
      `app/components/shared/FileAccessManager.tsx` (bulk mode) to
      `POST /api/files/bulk-share/group`, sending
      `{ fileIds, groupId, allowPreview, allowDownload }`; render the result
      summary in the modal
- [x] T017 [US3] Run quickstart Scenario 4 in `bun run dev`: group share with
      download disabled verified from a member account, re-share with no
      duplicates

**Checkpoint**: All user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Authorization, efficiency, documentation, and merge readiness across
all stories.

- [x] T018 [P] Security review of the two new routes + service methods: owner/admin
      checks on every file, self-share rejection, group-membership check,
      no secrets logged; verify quickstart Scenario 5 manually
- [x] T019 [P] Efficiency review: confirm both bulk service methods use one
      batch read + a single `$transaction` (no N+1, no per-item sequential
      awaits), per Constitution Efficiency & Optimization principle
- [x] T020 Run full quality gates and fix all failures: `bun run lint`,
      `bun run typecheck`, `bun run build`
- [x] T021 Run the complete `specs/001-bulk-move-share/quickstart.md`
      end-to-end; all scenarios pass
- [x] T022 [P] Update `specs/001-bulk-move-share/spec.md` User Story 2
      acceptance 3 to match the invite-flow behavior for unknown emails
      (Decision 3 in `research.md`)
- [x] T023 [P] Refresh the repo index after code changes: run `graft build`
      (per AGENTS.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS US2/US3
- **User Stories (Phase 3+)**: US1 depends only on Setup; US2/US3 depend on
  Foundational completion
  - US1 → US2 → US3 can run sequentially in priority order
  - US2 and US3 both depend on T005 (bulk-mode `FileAccessManager`) but otherwise
    touch different files and can be staffed in parallel
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup — no dependency on US2/US3
- **User Story 2 (P1)**: Needs Foundational (T003–T006) — independent of US1/US3
- **User Story 3 (P2)**: Needs Foundational (T003–T006) — independent of US1/US2

### Within Each User Story

- Audit/validate before fixing (US1)
- Service method before route before UI wiring (US2/US3)
- Manual validation (quickstart scenario) before story is complete

### Parallel Opportunities

- Phase 1 tasks T001–T002 run in parallel
- Phase 2 tasks T003–T005 run in parallel; T006 follows
- US1 (T007–T009) can run in parallel with US2/US3 once Foundational is done
- US2 and US3 service methods (T010, T014) and routes (T011, T015) run in
  parallel — different files
- T022/T023 run in parallel with T020/T021

---

## Parallel Example: User Story 2 + User Story 3

```bash
# Launch the two bulk service methods together:
Task: "Add bulkShareWithUser to app/lib/share-service.ts"
Task: "Add bulkShareWithGroup to app/lib/group-service.ts"

# Launch the two routes together:
Task: "Create POST handler in app/api/files/bulk-share/route.ts"
Task: "Create POST handler in app/api/files/bulk-share/group/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (bulk move validation — bulk move already
   exists; fix gaps only)
3. **STOP and VALIDATE**: quickstart Scenario 1
4. Deploy/demo if ready

### Incremental Delivery

1. Setup → Foundation ready (Phase 1 + 2)
2. Add User Story 1 → validate → Deploy/Demo (MVP)
3. Add User Story 2 (bulk share by email) → validate → Deploy/Demo
4. Add User Story 3 (bulk share with group) → validate → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Developer A: Phase 1 + US1 (bulk move validation)
2. Developer B: Phase 2 foundational UI, then US2 (bulk share by email)
3. Developer C: US3 (bulk share with group) after Foundational
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- No automated tests were requested; validation is manual via quickstart.md +
  quality gates
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break
  independence
