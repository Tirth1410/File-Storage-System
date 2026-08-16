# Implementation Plan: Bulk Operations Performance & Reliability Fix

**Branch**: `002-bulk-ops-performance` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-bulk-ops-performance/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Bulk move (10-20s) and bulk share with a group (fails on a 5000 ms Prisma
interactive-transaction timeout) are slow or broken because the current
implementation issues per-item queries instead of set-based operations:

- **Bulk move** (`app/lib/folder-service.ts:bulkMove`): one recursive-CTE
  descendant check per selected folder (folder-service.ts:552-572) plus one
  `auditService.log` → `auditLog.create` round trip per moved item
  (folder-service.ts:622-639). The state change is already set-based
  (`updateMany`, folder-service.ts:607-620).
- **Bulk share with a group** (`app/lib/group-service.ts:bulkShareWithGroup`):
  `prisma.$transaction(shared.map(...groupFile.upsert))` (group-service.ts:507)
  runs the interactive transaction at the default 5000 ms timeout; on the remote
  Supabase database a large selection exceeds it and the whole operation fails.
- **Bulk share with a user** (`app/lib/share-service.ts:bulkShareWithUser`):
  identical array-`$transaction` upsert pattern (share-service.ts:194-208) with
  the same timeout exposure, plus sequential per-item audit writes.
- **Select-all share gap**: the dashboard share flow (`handleBatchShare`,
  dashboard/page.tsx:401-410) only sends the currently loaded page's file IDs;
  select-all is not forwarded, so a select-all share silently shares only the
  current page.

The fix replaces per-item loops with single set-based statements per affected
table (following the bulk-delete precedent at `app/lib/file-service.ts`
`MAX_BULK_DELETE_FILES = 500`, `auditLog.createMany` inside one transaction),
batches audit writes, resolves the descendant check in one query, adds a shared
500-item request cap aligned with bulk delete, and wires select-all through the
share flow. No schema changes are required.

## Technical Context

**Language/Version**: TypeScript 5.x (`tsc --noEmit`)

**Primary Dependencies**: Next.js 16.2.10 (App Router), React 19, Prisma 7.8.0
(`@prisma/client` + `@prisma/adapter-pg`), PostgreSQL on Supabase, bun (sole
package manager/runner), better-auth (session), R2 (object storage — not
involved in move/share state changes)

**Storage**: PostgreSQL (Supabase) via Prisma. Affected tables: `folder`,
`file`, `group_file`, `file_permission`, `invitation`, `audit_log`.

**Testing**: `bun test` (bun:test); existing example at
`app/lib/upload-manager.test.ts`. Quality gates: `bun run lint`, `bun run
typecheck`, prettier formatting.

**Target Platform**: Web — Next.js server route handlers + React client
dashboard.

**Project Type**: Web application (full-stack Next.js, App Router).

**Performance Goals**: Bulk move ≤3s and bulk share (group or user) ≤5s for a
500-item request, measured end-to-end (confirmation click to refreshed UI)
against the production Supabase environment (SC-001..SC-003). Currently move
takes 10-20s and group share fails outright for large selections.

**Constraints**: 500-item cap per bulk request (FR-004), aligned with
`MAX_BULK_DELETE_FILES`; preserve per-item outcome reporting, audit trail, and
all correctness rules (FR-008..FR-010); clear error messages, never raw
transaction errors (FR-011); no new infrastructure (per user requirement); the
existing `TRANSACTION_TIMEOUT = { maxWait: 10_000, timeout: 20_000 }`
(folder-service.ts:32) is the project's established interactive-transaction
budget.

**Scale/Scope**: User libraries can reach thousands of files; bulk requests are
capped at 500 items per request. Scope is limited to the existing bulk move and
bulk share (group + user, including the no-account invite path) flows.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Gate                                  | Basis                                                                       | Verdict                                                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1 — Efficiency (Principle V)         | No N+1 queries; batch DB access; minimize round trips; profile before/after | MUST pass: the fix removes N+1 audit writes, per-folder CTE round trips, and array-`$transaction` upserts                                                                |
| G2 — Conventions (Principle II)       | bun only; surrounding-code precedence                                       | MUST pass: `bun` scripts; follow folder-service/share-service route & error-handling patterns                                                                            |
| G3 — Modularity (Principle III)       | Small focused units, explicit boundaries                                    | MUST pass: share the 500-cap constant and set-based helpers; no logic buried in routes                                                                                   |
| G4 — Security                         | Authorization on every access; parameterized SQL; no secrets in logs        | MUST pass: keep owner/group-membership checks; raw SQL via parameterized `Prisma.sql`/`Prisma.join`, never string interpolation; reuse `$queryRawUnsafe` binding pattern |
| G5 — Quality gates                    | `bun run lint`, `bun run typecheck`, formatter, tests                       | MUST pass before merge; add unit tests for cap enforcement, set-based writes, and audit batching                                                                         |
| G6 — DB changes via Prisma migrations | Schema changes reviewed for perf impact                                     | PASS by design: no schema changes or new indexes anticipated; verify in Phase 1                                                                                          |

Result: PASS. Re-checked after Phase 1 design — all gates still hold:
D1-D4 remove every N+1 query and array-`$transaction` upsert (G1), D5 shares the
cap constant (G3), D4/D8 bound transaction scope and add no schema/index changes
(G6), raw SQL is parameterized throughout (G4), and unit tests are planned for
the changed services (G5). No complexity-tracking entries required (see table
below, left empty).

## Project Structure

### Documentation (this feature)

```text
specs/002-bulk-ops-performance/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── bulk-operations-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

No new directories. The change touches existing files only and adds tests
alongside the code they cover:

```text
app/
├── lib/
│   ├── folder-service.ts      # bulkMove: single-query descendant check, audit createMany, 500-cap
│   ├── group-service.ts       # bulkShareWithGroup: set-based ON CONFLICT upsert, audit createMany, 500-cap, select-all
│   ├── share-service.ts       # bulkShareWithUser: set-based ON CONFLICT upsert, audit createMany, 500-cap, select-all
│   ├── invitation-service.ts  # createBulkFileInvites: batched invite upsert + bounded-parallel email delivery
│   ├── file-service.ts        # export shared MAX_BULK_OPERATION_ITEMS constant (or new lib/bulk.ts)
│   ├── bulk.ts                # NEW: MAX_BULK_OPERATION_ITEMS = 500, set-based upsert SQL builders, descendant-check query
│   ├── folder-service.test.ts # NEW: bulkMove cap, single-query descendant check, audit batching
│   ├── group-service.test.ts  # NEW: cap, single upsert statement, audit batching
│   └── share-service.test.ts  # NEW: cap, single upsert statement, audit batching
├── api/files/
│   ├── bulk-move/route.ts     # 500-cap error mapping (400)
│   ├── bulk-share/route.ts    # select-all fields + 500-cap
│   └── bulk-share/group/route.ts # select-all fields + 500-cap
└── components/shared/
    ├── ShareModal.tsx         # accept selectAll/excludeIds/sourceFolderId, forward to FileAccessManager
    └── FileAccessManager.tsx  # pass select-all context to both bulk-share endpoints
```

`app/dashboard/page.tsx` (`handleBatchShare`) is updated to forward
`selectAll`/`excludeIds`/source folder, matching `submitBulkMove` and
`handleBatchDelete`.

**Structure Decision**: Single-project Next.js app; follow the existing
`app/lib` service + `app/api` route-handler + `app/components` split. The cap
constant and set-based SQL helpers live in a small new `app/lib/bulk.ts` module
(G3 modularity) so `file-service`, `folder-service`, `group-service`, and
`share-service` all reference one source of truth.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations are anticipated. This table is intentionally empty.
