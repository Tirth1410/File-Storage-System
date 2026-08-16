# Implementation Plan: Bulk Move & Bulk Share

**Branch**: `001-bulk-move-share` | **Date**: 2026-08-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-bulk-move-share/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Add a bulk **Share** action alongside the existing bulk **Move** action in the
"My Files" tab. Bulk move is already implemented end-to-end (selection toolbar →
`/api/files/bulk-move` → `folderService.bulkMove`) and must be validated; the new
work is bulk share: share all selected files with one user (by email, read/write
permission) or one group (preview/download toggles), reusing the existing share
dialog patterns. Design follows existing conventions: Next.js route handlers with
`withLogging` + `getRequestUser`, service-layer logic in `share-service.ts` /
`group-service.ts`, and result buckets (shared/skipped/notFound/forbidden)
mirroring `BulkMoveResult`. No new database tables required.

## Technical Context

**Language/Version**: TypeScript, Next.js 16.2.10 (App Router), React 19.2.4

**Primary Dependencies**: Next.js, Prisma 7 (`@prisma/client`), Better Auth,
`@aws-sdk/client-s3`, lucide-react, sonner, react-loading-skeleton

**Storage**: PostgreSQL via Prisma (Supabase-backed). Models touched: `File`,
`Folder`, `FilePermission`, `GroupFile`, `Group`, `GroupMember`, `Invitation`

**Testing**: No automated test suite exists in the repo. Validation = `bun run
lint`, `bun run typecheck`, `bun run build`, plus manual end-to-end runs in
`bun run dev` per `quickstart.md`

**Target Platform**: Modern web browsers (Next.js SSR client bundle)

**Project Type**: Web application (frontend + backend in one Next.js app)

**Performance Goals**: Bulk operations of up to 50 items complete in a single
user action; no N+1 queries — one query to resolve items, batched writes in a
transaction

**Constraints**: Reuse existing share dialog patterns; no new tables; quality
gates (`lint`, `typecheck`, `build`) must pass; keep per-request DB work bounded

**Scale/Scope**: Single-user file operations (≤50 selected items); files only for
share (folders excluded); one recipient per share action

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Gate (Constitution v1.0.0)         | Verdict | Evidence in plan                                                                                   |
| ---------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| I. Production-Grade Quality        | PASS    | Existing routes/services already meet patterns; new code must pass `lint`, `typecheck`, `build`    |
| II. Coding Conventions             | PASS    | New work mirrors `bulk-move` route, `BulkMoveResult` buckets, `FileAccessManager` UI patterns      |
| III. Modularity                    | PASS    | Logic stays in `share-service`/`group-service`; UI reused/parameterized, no duplicated share logic |
| IV. Readability & Maintainability  | PASS    | Same naming and structure as existing bulk/ share code paths                                       |
| V. Efficiency & Optimization       | PASS    | Single batch queries + transaction (see `research.md` perf decision)                               |
| Performance & Efficiency Standards | PASS    | No N+1; selective queries; bounded loops (≤50 items)                                               |
| Quality Gates & Workflow           | PASS    | `bun` only; gates enforced before merge; Prisma via migrations (no schema change needed)           |
| Governance                         | PASS    | No new roles; ownership/admin checks preserved (FR-009)                                            |

No violations requiring a Complexity Tracking justification.

**Re-check after Phase 1 design (2026-08-15)**: PASS — design adds no schema
changes, reuses existing `share-service`/`group-service`/modal patterns
(Modularity, Conventions), and specifies batched reads + a single transaction
(Efficiency). No new complexity introduced.

## Project Structure

### Documentation (this feature)

```text
specs/001-bulk-move-share/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── api/files/
│   ├── bulk-move/route.ts            # EXISTS - validate only
│   ├── bulk-share/route.ts           # NEW - share selected files with a user (email)
│   └── bulk-share/group/route.ts     # NEW - share selected files with a group
├── components/
│   ├── dashboard/SelectionToolbar.tsx  # MODIFY - add "Share (N)" action button
│   ├── shared/ShareModal.tsx           # MODIFY - accept bulk mode (file list)
│   └── shared/FileAccessManager.tsx    # MODIFY - parametrized file IDs; links tab hidden in bulk
├── dashboard/page.tsx               # MODIFY - wire bulk share state + submit
└── lib/
    ├── share-service.ts             # MODIFY - add bulkShareWithUser
    └── group-service.ts             # MODIFY - add bulkShareWithGroup
```

**Structure Decision**: Single Next.js project. New endpoints and service methods
mirror the existing `bulk-move` route and share-service/group-service methods
exactly, so no new directories or architectural layers are introduced.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Table intentionally empty.
