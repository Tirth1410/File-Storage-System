---
description: "Task list for the Bulk Share Email Digest feature"
---

# Tasks: Bulk Share Email Digest

**Input**: Design documents from `/specs/003-share-email-digest/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/invite-digest-email.md, quickstart.md

**Tests**: Tests ARE requested for this feature — spec.md "User Scenarios & Testing (mandatory)" and quickstart.md "Automated checks" enumerate the exact unit tests to update/add. Follow TDD: write each test, confirm it FAILS, then implement.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently. Because the digest send replaces the per-file email loop (a single edit in `createBulkFileInvites`), US1 carries the implementation; US2–US4 add their own verification tests. All user-story phases depend on US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Include exact file paths in descriptions

## Conventions

- **Package manager/runner**: `bun` only (AGENTS.md — no npm/yarn/pnpm).
- **No schema change**: `prisma/schema.prisma` is untouched; `bun prisma migrate status` must report no drift.
- **HTTP API contract unchanged**: `POST /api/files/bulk-share` and `BulkShareWithUserResult` are NOT modified (spec Assumptions, contracts §1).
- **Single-file/group/resend invite emails unchanged** (D3): only the bulk file-share path (`createBulkFileInvites`) emits the digest.
- Quality gates per constitution: `bun run lint`, `bun run typecheck`, `bun run format`, `bun test`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify a clean, green baseline on the feature branch

- [x] T001 Verify git branch `003-share-email-digest` is checked out and the working tree is clean (`git status`) — **user ruling: implemented on `feat/bulk-operations`; tree clean**
- [x] T002 [P] Verify project dependencies are installed and up to date with `bun install` (AGENTS.md)
- [x] T003 [P] Confirm baseline quality gates pass before any changes: `bun run typecheck` and `bun run lint`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm the two hard constraints that gate all user-story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Confirm no schema change is required: run `bun prisma migrate status` and verify it reports no pending/drifted migrations (data-model.md — no DDL expected) — **live-DB↔schema diff: "No difference detected" (no drift); migrations "not yet applied" is baseline `db push` workflow**
- [x] T005 [P] Confirm the baseline unit-test suite passes before changes: `bun test` — **31 pass / 0 fail**

**Checkpoint**: Foundation ready — schema untouched, baseline green. User story implementation can now begin.

---

## Phase 3: User Story 1 - One Notification Per Bulk Share (Priority: P1) 🎯 MVP

**Goal**: A bulk share to an unregistered recipient delivers exactly **one** digest notification email for the whole action (not one per file), containing no file names and no file count, while every shared file still gets its own pending invitation (FR-001, FR-002, FR-003, FR-004, FR-005, FR-007, FR-008).

**Independent Test**: Bulk-share 500 files to a single unregistered email and verify exactly 1 notification email is delivered, 500 invites are created, and the email names no files and no count.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Add `sendInviteDigestEmailService` to the email-service mock in `app/lib/share-service.test.ts:105-110` and update the "unregistered recipients" bulk-invite test (`app/lib/share-service.test.ts:184-200`) to assert `state.emailSends === 1` (was 3) while still asserting 3 invites created (FR-004) and 1 `auditLog.createMany`
- [x] T007 [US1] Add test in `app/lib/share-service.test.ts`: bulk-sharing 500 files to `new@x.com` results in exactly 1 email send and 500 invites created (SC-001, FR-001/FR-004) (depends on T006 — same file)

### Implementation for User Story 1

- [x] T008 [P] [US1] Create digest template `app/lib/email-templates/invite-digest-email.ts` exporting `generateInviteDigestEmailHtml` and `generateInviteDigestEmailText` per `contracts/invite-digest-email.md` §2 and D2: header/body "{inviterName} shared files with you on Vault.", "Join Vault" CTA → `signUpUrl`, optional expiry footer mirroring `invite-email.ts`; subject "Files have been shared with you on Vault"; NO `resourceLabel`, NO file names, NO count, no singular/plural logic
- [x] T009 [US1] Add `sendInviteDigestEmailService` to `app/lib/email-service.ts`: imports `generateInviteDigestEmailHtml`/`generateInviteDigestEmailText`, reuses existing `sendBrevoEmail`, subject "Files have been shared with you on Vault", `tags: ["invite_digest"]`, returns `SendEmailResult` and never throws (contract §2; depends on T008)
- [x] T010 [US1] Add `deliverInviteDigestEmail` helper in `app/lib/invitation-service.ts`: builds `signUpUrl = ${APP_URL}/sign-up?email=${encodeURIComponent(email)}` (same as existing `deliverInviteEmail` at `app/lib/invitation-service.ts:111`), calls `sendInviteDigestEmailService`, returns success boolean (FR-003; depends on T009)
- [x] T011 [US1] In `createBulkFileInvites` (`app/lib/invitation-service.ts`), delete the per-file Batches-of-5 `deliverInviteEmail` loop at `:288-305` (and the `EMAIL_BATCH_SIZE` constant); after invites are created/refreshed, send ONE digest via `deliverInviteDigestEmail` guarded by `invites.length > 0` (FR-008); assign the digest's success boolean to every `invited[].emailSent` so the response shape is preserved (D1, D4; depends on T010)
- [x] T012 [US1] Reword the per-file audit rows in the existing `auditLog.createMany` at `app/lib/invitation-service.ts:307-314` from "Sent file-share invite …" to "Created file-share invite …", and append one `{ action: "invite_digest_sent", fileId: null, details: "Sent bulk-share digest email to {email}" }` row per action with ≥1 invite — still a single batched `createMany`, no extra round trip (D5; depends on T011)
- [x] T013 [US1] Add FR-007 test in `app/lib/share-service.test.ts`: digest delivery failure (mock returns `{ success: false, error }`) → share still succeeds, invites intact, every `invited.emailSent === false` (depends on T011)
- [x] T014 [US1] Add FR-008 test in `app/lib/share-service.test.ts`: every file skipped/forbidden/not-found → zero email sends and empty `invites` (depends on T011)

**Checkpoint**: 500-file bulk share → exactly 1 email, 500 invites, no file names/count in the email. `bun test` green.

---

## Phase 4: User Story 2 - Bulk Share Completes Quickly Regardless of File Count (Priority: P1)

**Goal**: Bulk sharing completes in a short, predictable time independent of file count — one ~0.5 s digest send instead of ~55 s of per-file sends (SC-002).

**Independent Test**: Time a 500-file bulk share and observe it completes in seconds; completion time is comparable to a 10-file share (not ~50×).

### Implementation for User Story 2

- [x] T015 [US2] Add SC-002 structural test in `app/lib/share-service.test.ts`: a 500-file bulk share to `new@x.com` performs exactly 1 digest send (`state.emailSends === 1`), proving no per-file email loop remains (depends on T011)
- [x] T016 [US2] Clean up the bulk path: `grep app/lib/invitation-service.ts` for `EMAIL_BATCH_SIZE`, `deliverInviteEmail`, `resourceLabel`; confirm they remain only in the single-file/group/resend paths (`createFileInvite`, `createGroupInvite`, `resendInvite` — D3) and remove any stale bulk-path references (depends on T011)
- [ ] T017 [US2] Run manual timing scenario S2 in `specs/003-share-email-digest/quickstart.md`: `POST /api/files/bulk-share` with 500 files completes in **under 10 s**; compare a 10-file share vs a 500-file share to the same recipient — completion time comparable, not ~50× (SC-002)

**Checkpoint**: 500-file share completes in seconds; no per-file email calls remain in the bulk path.

---

## Phase 5: User Story 4 - Re-Sharing Does Not Re-Spam (Priority: P2)

**Goal**: Re-sharing additional files to a recipient with existing pending invites sends exactly **one** new digest for the new action — no per-file re-sends of pending invites (FR-006, SC-005).

**Independent Test**: Share 100 files, then 50 more to the same recipient; verify exactly 2 emails total (one per action).

### Implementation for User Story 4

- [x] T018 [US4] Add test in `app/lib/share-service.test.ts`: share 100 files to `new@x.com` (1 email) then share 50 more to the same recipient → exactly 1 new email (total `state.emailSends === 2`) (SC-005, FR-006; depends on T011)
- [x] T019 [US4] Add test in `app/lib/share-service.test.ts`: make `prismaMock.invitation.findMany` return an existing PENDING invite; a subsequent bulk share to that recipient emits exactly 1 new digest and does not re-send per pending file (FR-006; depends on T011)
- [ ] T020 [US4] Run manual validation scenario S4 in `specs/003-share-email-digest/quickstart.md`: 100 + 50 shares to the same inbox → exactly 2 emails; pending invites from both actions remain acceptable together

**Checkpoint**: Re-share produces exactly 1 new email per action; no re-spam of pending invites.

---

## Phase 6: User Story 3 - Single-File Share Still Notifies (Priority: P3)

**Goal**: A 1-file bulk share still sends exactly one notification, and the digest reads naturally at a count of one (no pluralization issues since no count is mentioned) (US3-SC1, US3-SC2).

**Independent Test**: Share exactly 1 file to an unregistered email and confirm one notification email is delivered with correct wording.

### Implementation for User Story 3

- [x] T021 [US3] Add test in `app/lib/share-service.test.ts`: single-file bulk share to `new@x.com` → exactly 1 email send (US3-SC1; depends on T011)
- [x] T022 [P] [US3] Add template unit test `app/lib/email-templates/invite-digest-email.test.ts`: digest HTML/text for a 1-file share vs a 500-file share are identical in shared wording (inviter/sign-up/expiry may differ); assert zero file names and zero count tokens in both (FR-002/FR-005, US3-SC2; independent of T021 — different file)

**Checkpoint**: 1-file share sends exactly 1 digest; wording is count-agnostic.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify the complete feature against all quality gates and the quickstart validation guide

- [x] T023 [P] Run full quality gates: `bun run format`, `bun run lint`, `bun run typecheck`, `bun test` — all must pass (constitution §Quality Gates)
- [x] T024 [P] Run `bun prisma migrate status` — must report no schema drift (verified via `migrate diff`: "No difference detected"; 4 unapplied migration files are the known T004 `db push` baseline)
- [ ] T025 [P] Execute manual validation scenarios S1–S6 in `specs/003-share-email-digest/quickstart.md`; confirm SC-004 by reviewing the delivered email for **zero** individual file names and no count (needs running dev server + real Brevo + 500-file account)
- [x] T026 [P] Security/constitution review: no new secrets, auth/ownership paths untouched (`share-service.ts` unchanged; `invitation-service.ts` authorization logic `isInvitingSelf`/ownership checks untouched), no per-file data in the digest email (template/test assert zero file names/counts)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — carries the entire implementation (template → email service → digest send → audit reword)
- **User Story 2 (P1)**: Depends on US1 T011 (the digest send replaces the per-file loop); adds structural/latency verification
- **User Story 4 (P2)**: Depends on US1 T011; verification only (one digest per action falls out of the implementation)
- **User Story 3 (P3)**: Depends on US1 T008/T011; verification + template wording test only

### Within Each User Story

- Tests written FIRST and failing before implementation (US1)
- Template before email service before digest-send integration (US1)
- Story complete before moving to next priority

### Parallel Opportunities

- Setup: T002 and T003 (different commands)
- Foundational: T004 and T005 (different commands)
- US1: T006 (test/mock edit) runs parallel with T008 (template file — different files); T013/T014 are serialized with T006/T007 because they share `app/lib/share-service.test.ts`
- US3: T022 (template test file) runs parallel with T021 (share-service test file)
- Polish: T023–T026 run in parallel (independent commands/reviews)
- US2/US4/US3 verification tasks can be picked up in parallel once US1 T011 lands

---

## Parallel Example: User Story 1

```bash
# Launch the template and the test/mock edit together (different files):
Task: "Create digest template app/lib/email-templates/invite-digest-email.ts (T008)"
Task: "Update email-service mock + unregistered-recipients test in app/lib/share-service.test.ts (T006)"

# After T008/T009/T010 (email-service + helper chain):
Task: "Replace per-file email loop with single digest send in app/lib/invitation-service.ts (T011)"
Task: "Add 500-file → 1 email test in app/lib/share-service.test.ts (T007)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (green baseline)
2. Complete Phase 2: Foundational (no schema drift confirmed — CRITICAL gate)
3. Complete Phase 3: User Story 1 (digest template → `sendInviteDigestEmailService` → `deliverInviteDigestEmail` → single send in `createBulkFileInvites` → audit reword; tests T006/T007 first, red → green)
4. **STOP and VALIDATE**: 500 files → exactly 1 email; `bun test`, `bun run lint`, `bun run typecheck`, `bun run format` all pass
5. Deploy/demo if ready — this alone delivers SC-001/SC-002/SC-004/SC-005

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (MVP!)
3. Add US2 (structural + manual timing) → verify SC-002 → Deploy/Demo
4. Add US4 (re-share tests) → verify SC-005 → Deploy/Demo
5. Add US3 (single-file + wording tests) → verify US3 → Deploy/Demo
6. Polish: full gates + quickstart S1–S6 manual validation

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done: US1 is the single implementation track (must be sequential — one function edited)
3. After US1 T011 lands, verification tasks fan out in parallel: US2 (T015–T017), US4 (T018–T020), US3 (T021–T022), and Polish reviews (T025–T026)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- **No schema change** — if any task requires `bun prisma migrate`, stop and re-check data-model.md
- **HTTP contract unchanged** — `emailSent` stays per-invite but becomes the single digest result for all entries (D4)
- Verify tests fail before implementing (TDD for US1)
- Commit after each task or logical group
- Stop at each checkpoint to validate the story independently
- Avoid: vague tasks, same-file parallel edits (`app/lib/share-service.test.ts` is serialized), cross-story dependencies that break independence
