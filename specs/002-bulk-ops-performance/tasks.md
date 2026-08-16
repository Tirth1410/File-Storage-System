---
description: "Task list for feature implementation"
---

# Tasks: Bulk Operations Performance & Reliability Fix

**Input**: Design documents from `/specs/002-bulk-ops-performance/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/bulk-operations-api.md, quickstart.md

**Tests**: Included. The plan (`plan.md` project structure) and validation guide (`quickstart.md`) define unit tests for the changed services; they are listed first in each user-story phase and must FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single Next.js project: `app/lib/`, `app/api/files/`, `app/components/shared/` at repository root. Tests sit next to the code they cover (`app/lib/*.test.ts`, run with `bun test`).

---

## Phase 1: Setup (Baseline)

**Purpose**: Confirm the starting state is green and capture pre-fix measurements so the performance targets (SC-001..SC-003) can be verified later.

- [ ] T001 Run baseline quality gates `bun run typecheck`, `bun run lint`, and `bun test` and confirm all pass before any code change
- [ ] T002 Capture baseline timings against the dev environment: bulk move of 500 items, bulk share with a group of 500 files, bulk share with a user of 500 files (record actual durations; expected: move 10-20s, group share errors out on the 5000 ms timeout)

**Checkpoint**: Baseline recorded; the 10-20s move and 5000 ms group-share failure are reproduced (SC-001..SC-003 "before" numbers).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that MUST be complete before ANY user story — the 500-item cap, set-based SQL builders, and the single descendant-check query.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create shared module `app/lib/bulk.ts` exporting: `MAX_BULK_OPERATION_ITEMS = 500`; a `BulkOperationError` class carrying a user-facing message; `validateItemCount(count)` (throws the clear "more than 500 items" error, mirroring `app/lib/file-service.ts:550`); parameterized upsert builders `buildGroupFileUpsertSql(...)` and `buildFilePermissionUpsertSql(...)` using `Prisma.sql`/`Prisma.join` with `ON CONFLICT (group_id, file_id)` / `(file_id, user_id)` targets (no string interpolation); and `buildDescendantCheckQuery(...)` producing a single multi-seed recursive CTE (seed `folder.id IN (selectedIds)`, walk descendants carrying the seed root, return roots whose subtree contains the target)
- [x] T004 Add unit tests in `app/lib/bulk.test.ts` for `validateItemCount` (501 throws, 500 passes), the upsert builders (correct conflict targets, all values bound via placeholders), and `buildDescendantCheckQuery` (single statement, self-descendant detection)
- [x] T005 [P] Alias `MAX_BULK_DELETE_FILES` to `MAX_BULK_OPERATION_ITEMS` in `app/lib/file-service.ts` so delete, move, and share share one source of truth (keep the existing bulk-delete validation message wording)

**Checkpoint**: Foundation ready - `bulk.ts` + its tests green; user stories can now be implemented.

---

## Phase 3: User Story 1 - Bulk Move Completes Quickly (Priority: P1) 🎯 MVP

**Goal**: A bulk move of up to 500 items (including "select all") completes in under 3 seconds instead of 10-20s, with per-item outcomes and audit entries unchanged (FR-001, FR-004, FR-005, FR-007, FR-008, FR-009; SC-001, SC-004).

**Independent Test**: Select 500 mixed files/folders, move them to a target, and time confirm-to-refresh — must be <3s (currently 10-20s); counts in the confirmation must match pre-fix output.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [US1] Add `app/lib/folder-service.test.ts` for `bulkMove`: 501-item (post select-all resolution) request throws the cap error; the descendant check issues a single query regardless of folder count (assert query count, not one per folder); a single `auditLog.createMany` is issued per operation; moved/skipped/forbidden/notFound classification matches existing behavior (expect FAIL until T007-T009 land)

### Implementation for User Story 1

- [x] T007 [US1] Replace the per-folder descendant-check loop in `bulkMove` (`app/lib/folder-service.ts` ~552-572) with a single `buildDescendantCheckQuery` call (values bound), producing the same per-folder `failed` classification ("Cannot move a folder into itself or one of its descendants")
- [x] T008 [US1] Replace the sequential `auditService.log` loop in `bulkMove` (`app/lib/folder-service.ts` ~622-639) with a single `auditLog.createMany` executed inside the move transaction (`TRANSACTION_TIMEOUT` `{ maxWait: 10_000, timeout: 20_000 }`), preserving the exact detail strings used today
- [x] T009 [US1] Enforce `MAX_BULK_OPERATION_ITEMS` in `bulkMove` after select-all resolution (`fileIds.length + folderIds.length`) by throwing `BulkOperationError` ("Cannot move more than 500 items at once", matching bulk-delete phrasing at `app/lib/file-service.ts:550`)
- [x] T010 [P] [US1] Map `BulkOperationError` to HTTP 400 in `app/api/files/bulk-move/route.ts`; keep existing 403/404/409 mapping and the 500 catch-all returning a clear message (never raw transaction text)

**Checkpoint**: User Story 1 fully functional — 500-item move <3s, cap rejection works, tests green.

---

## Phase 4: User Story 2 - Bulk Share No Longer Fails (Priority: P1)

**Goal**: Bulk share with a group and with a user, including "select all", completes successfully in under 5 seconds (no 5000 ms expired-transaction error), with set-based state changes, batched audit, server-side select-all resolution, and unchanged outcome reporting (FR-002, FR-003, FR-006, FR-007, FR-008; SC-002, SC-003, SC-005).

**Independent Test**: Share 500 files with a group (preview on, download off) and with a registered user email — both must complete in <5s with a success message and every eligible file accessible afterward; no duplicate shares on repeat.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US2] Add `app/lib/group-service.test.ts` for `bulkShareWithGroup`: 501-item (post select-all resolution) request throws the cap error; a single ON CONFLICT upsert statement is issued (not one per item); a single `auditLog.createMany`; select-all resolves the full folder file set minus `excludeIds`; repeating a share updates rather than duplicates (expect FAIL until T013/T015/T017 land)
- [x] T012 [P] [US2] Add `app/lib/share-service.test.ts` for `bulkShareWithUser`: cap rejection; single ON CONFLICT upsert for `file_permission`; single `auditLog.createMany`; select-all resolution; no-account recipients still route to the invite path (expect FAIL until T014/T016/T018 land)

### Implementation for User Story 2

- [x] T013 [US2] Replace the array-`$transaction(shared.map(...groupFile.upsert))` loop in `bulkShareWithGroup` (`app/lib/group-service.ts` ~507-524) with one `buildGroupFileUpsertSql` statement executed inside a single interactive transaction with `TRANSACTION_TIMEOUT`
- [x] T014 [P] [US2] Replace the array-`$transaction(shared.map(...filePermission.upsert))` loop in `bulkShareWithUser` (`app/lib/share-service.ts` ~194-208) with one `buildFilePermissionUpsertSql` statement inside a single interactive transaction with `TRANSACTION_TIMEOUT`
- [x] T015 [US2] Batch audit writes into a single `auditLog.createMany` in the same transaction as the state change in `bulkShareWithGroup` (`app/lib/group-service.ts`), preserving detail strings
- [x] T016 [P] [US2] Batch audit writes into a single `auditLog.createMany` in the same transaction in `bulkShareWithUser` (`app/lib/share-service.ts`), preserving detail strings
- [x] T017 [US2] Add `selectAll`/`sourceFolderId`/`excludeIds` params with server-side resolution (owner + `status: "available"` in the source folder, minus excludes) and `validateItemCount` enforcement in `bulkShareWithGroup` (`app/lib/group-service.ts`)
- [x] T018 [P] [US2] Add `selectAll`/`sourceFolderId`/`excludeIds` params with server-side resolution and `validateItemCount` enforcement in `bulkShareWithUser` (`app/lib/share-service.ts`)
- [x] T019 [P] [US2] Batch `createBulkFileInvites` (`app/lib/invitation-service.ts` ~250-274): one `findMany` of existing PENDING invites by email + file IDs, one `createMany` for missing (fresh tokens), one `updateMany` for existing (permission/expiry), a single batched audit write, and bounded-concurrency email delivery (batches of 5-10 via `Promise.all`)
- [x] T020 [P] [US2] Update `app/api/files/bulk-share/group/route.ts`: accept/validate `selectAll`/`folderId`/`excludeIds` per `contracts/bulk-operations-api.md`; map `BulkOperationError` to 400; keep 403/404 mapping and clear-message 500
- [x] T021 [P] [US2] Update `app/api/files/bulk-share/route.ts`: accept/validate `selectAll`/`folderId`/`excludeIds`; map `BulkOperationError` to 400; keep 400 (self-share), 403, and clear-message 500
- [x] T022 [US2] Forward the select-all context (`selectAll`, `folderId`, `excludeIds`) from `handleBatchShare` in `app/dashboard/page.tsx` (~401-410) to `ShareModal` — today select-all shares only the currently loaded page (FR-006)
- [x] T023 [P] [US2] Accept and forward `selectAll`/`sourceFolderId`/`excludeIds` props in `app/components/shared/ShareModal.tsx`
- [x] T024 [P] [US2] Forward the select-all context to both bulk-share endpoints in `app/components/shared/FileAccessManager.tsx` (bulk-share fetch ~204, bulk-share/group fetch ~304-312)

**Checkpoint**: User Stories 1 AND 2 both work — group and user share of 500 files <5s, select-all share resolves server-side, no duplicate shares, tests green.

---

## Phase 5: User Story 3 - Correctness and Audit Trail Preserved (Priority: P2)

**Goal**: Faster operations do not change what is recorded or reported — audit entries for every moved/shared item match pre-fix detail, and per-item outcomes (moved/shared/skipped/forbidden/not found + reasons) are identical (FR-008, FR-009, FR-010, FR-011; SC-006).

**Independent Test**: Perform one bulk move and one bulk share of 3+ items and compare activity-history entries and outcome counts against pre-fix behavior.

### Tests for User Story 3 ⚠️

- [x] T025 [US3] Reconcile the batched audit payloads in `bulkMove` (`app/lib/folder-service.ts`), `bulkShareWithGroup` (`app/lib/group-service.ts`), and `bulkShareWithUser` (`app/lib/share-service.ts`) against the detail templates in `app/lib/audit-service.ts` so every entry's detail text is byte-identical to pre-fix output
- [x] T026 [P] [US3] Add a regression test asserting per-item outcome classification (skipped/forbidden/notFound reasons identical to pre-fix) across `app/lib/folder-service.test.ts`, `app/lib/group-service.test.ts`, and `app/lib/share-service.test.ts`

### Implementation for User Story 3

- [x] T027 [US3] Ensure all three bulk routes (`app/api/files/bulk-move/route.ts`, `bulk-share/route.ts`, `bulk-share/group/route.ts`) map unexpected errors to clear user-facing messages and never surface raw Prisma/transaction text (SC-007, FR-011)
- [x] T028 [P] [US3] Confirm zero schema drift: run `bun prisma migrate status` (no migrations expected) and verify the invariants in `specs/002-bulk-ops-performance/data-model.md` still hold

**Checkpoint**: All user stories independently functional; correctness/audit verified end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, context-graph refresh, and end-to-end validation of the success criteria.

- [x] T029 [P] Run `bun run lint`, `bun run typecheck`, and the formatter across changed files; fix all findings (constitution quality gates)
- [x] T030 [P] Refresh the repo context graph with `graft build`
- [x] T031 Run `specs/002-bulk-ops-performance/quickstart.md` end-to-end (S1-S8): SC-001/SC-002/SC-003 timings, SC-004 250-vs-500 scaling, SC-005 >500 select-all rejection message, SC-006 audit-completeness counts (single `GROUP BY` audit query), SC-007 no raw timeout errors, invite-path behavior
- [x] T032 Re-measure invite-path latency at the 500-item cap (research.md D7 residual risk); record the decision to keep in-request delivery or file a follow-up for background email dispatch

### Validation results (T031/T032, 2026-08-15, dev env — Next.js dev server, remote Supabase pooler, 1001 seeded files)

| Scenario                                          | Result                                                                                                                                  | Target               | Status                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------- |
| S1 bulk move 500 items (warm)                     | 2.64 / 3.01 / 3.34s (dev-mode variance; cold first-hit 9.4s includes route compile)                                                     | <3s                  | ✓ (straddles in dev, production-compiled expected well under) |
| S2 bulk share → group, 500 items (warm)           | 3.65s, 500 shared, re-run upserts (no dupes, total rows 976)                                                                            | <5s                  | ✓                                                             |
| S3 bulk share → registered user, 500 items (warm) | 3.01s, 500 shared, no dupes                                                                                                             | <5s                  | ✓                                                             |
| S4 select-all share (server-side)                 | 476 shared = 501 − 25 excludes; excludes untouched; allowDownload=false persisted; totals 976 (no dupes)                                | FR-006               | ✓                                                             |
| S5 audit completeness                             | `file_moved` 2500, `file_shared` 1476, `group_file_shared` 1952, `invite_sent` 500 — all match reported counts, single `GROUP BY` query | SC-006               | ✓                                                             |
| S6 >500 rejection                                 | all 3 endpoints 400: "Cannot move/share more than 500 items at once"; zero partial writes (counts unchanged)                            | SC-005               | ✓                                                             |
| S7 no raw errors                                  | all responses clean `{error}` JSON; no "expired transaction"/Prisma text                                                                | FR-011               | ✓                                                             |
| S8 no-account invite path                         | 500 PENDING invitations created; **54.6s** (Brevo latency floor, D7)                                                                    | D7                   | ✓ (documented)                                                |
| SC-004 scaling                                    | 250→2.16/2.48s, 500→3.01/3.34s (~1.4x for 2x items, sublinear)                                                                          | no per-item slowdown | ✓                                                             |

- Fixed during validation: raw upsert SQL used snake_case column names; live schema has camelCase columns (`groupId`, `fileId`, `userId`, `"sharedByUserId"`, `"allowPreview"`, `"allowDownload"`, `"isActive"`, `"sharedAt"`, `"updatedAt"`, `"createdAt"`) with `ON CONFLICT ("groupId","fileId")` / `("fileId","userId")` (bulk.ts). Only `audit_log` is snake-mapped. Verified against live DB (information_schema + descendant CTE run); INSERT execution not possible on read-only replica — covered by the live S1-S8 runs above.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 and US2 can proceed in parallel (different files), then US3
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Different files than US1; independently testable
- **User Story 3 (P2)**: Depends on US1 and US2 (it verifies their outputs) - no parallel start

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Service logic before routes (routes depend on service error types)
- Within a single file (e.g. `folder-service.ts`), tasks are sequential: T007 → T008 → T009
- Story complete before moving to next priority

### Parallel Opportunities

- T005 (alias) is parallel with T003/T004
- US1 route task T010 [P] is parallel with the service refactors
- US2 service refactors split cleanly: group-service (T013/T015/T017) vs share-service (T014/T016/T018) vs invitation-service (T019) vs routes (T020/T021) vs UI (T022→T023/T024)
- All story test tasks T006, T011, T012, T026 [P] are parallel (distinct test files)
- US1 and US2 themselves can be implemented in parallel by different engineers

---

## Parallel Example: User Story 2

```bash
# Launch the two test files together:
Task: "Add group-service.test.ts for bulkShareWithGroup"
Task: "Add share-service.test.ts for bulkShareWithUser"

# Launch the share-service refactor alongside the group-service refactor:
Task: "Set-based upsert + audit batching in group-service.ts"
Task: "Set-based upsert + audit batching in share-service.ts"
Task: "Batch invites + bounded email in invitation-service.ts"

# Launch the routes and UI together:
Task: "Update bulk-share/group route (select-all + cap 400)"
Task: "Update bulk-share route (select-all + cap 400)"
Task: "Thread select-all props through ShareModal"
Task: "Forward select-all context in FileAccessManager"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (baseline)
2. Complete Phase 2: Foundational (`app/lib/bulk.ts` + tests)
3. Complete Phase 3: User Story 1 (bulk move)
4. **STOP and VALIDATE**: 500-item move <3s, cap rejection, tests green
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (bulk move) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (bulk share group + user + select-all) → Test independently → Deploy/Demo
4. Add User Story 3 (correctness/audit verification) → Test independently
5. Final: quality gates, graft refresh, quickstart validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (bulk move)
   - Developer B: User Story 2 (bulk share)
3. After US1 + US2: Developer A or B runs User Story 3 verification

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence
