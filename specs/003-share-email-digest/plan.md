# Implementation Plan: Bulk Share Email Digest

**Branch**: `003-share-email-digest` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-share-email-digest/spec.md`

## Summary

Today a bulk share to an unregistered recipient sends **one email per shared
file** (500 files → 500 Brevo API calls, ~0.55 s each → ~55 s request stall).
This plan collapses that into **exactly one notification email per share
action** — a generic digest that does **not** list file names and does **not**
mention the file count. Per-file pending invitations and their acceptance flow
are unchanged (FR-004); only the notification behavior changes (FR-001–FR-008).
The bulk-share HTTP API contract is unchanged.

Technical approach (from research): in `createBulkFileInvites`
(`app/lib/invitation-service.ts:210`), replace the per-file
`deliverInviteEmail` batch loop (`:290-305`) with a single
`deliverInviteDigestEmail` call that uses a new digest template
(`app/lib/email-templates/invite-digest-email.ts`) and a new
`sendInviteDigestEmailService` (`app/lib/email-service.ts`), reusing the
existing Brevo transport and the same sign-up URL
(`${APP_URL}/sign-up?email=…`) the single-file invite uses today. Invitation
creation (`createManyAndReturn`), existing-pending refresh, and the batched
`auditLog.createMany` all stay untouched — only the email loop is replaced.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Next.js 16.2.10 App Router, React 19, Node/Bun runtime

**Primary Dependencies**: Prisma 7 (`@prisma/client`), Brevo Transactional Email (raw `fetch` to `api.brevo.com/v3/smtp/email`), `bun` (sole package manager/runner)

**Storage**: Supabase-backed PostgreSQL via Prisma (`prisma/schema.prisma`); **no schema change** for this feature

**Testing**: `bun test` (unit tests colocated as `*.test.ts` under `app/lib/`, Prisma + email-service mocked), `bun run lint`, `bun run typecheck`, `bun run format`

**Target Platform**: Linux server (Vercel/Supabase), server-side only; no client changes

**Project Type**: Full-stack web application (Next.js)

**Performance Goals**: Bulk share of 500 files completes in **under 10 s**
(SC-002; previously ~55 s dominated by 500 sequential Batches-5 email sends);
exactly **1** notification email per action (SC-001/SC-005); completion time
effectively independent of file count.

**Constraints**: No change to the bulk-share API contract, selection/select-all
flow, or share permission model (spec Assumptions). Digest email must not name
files (SC-004) and must not mention a count (FR-005). Email delivery is
best-effort — a failure must not roll back the share (FR-007). One email per
action, no windowed coalescing (spec Assumptions).

**Scale/Scope**: Up to `MAX_BULK_OPERATION_ITEMS = 500` files per action
(`app/lib/bulk.ts:4`); this changes only the unregistered-recipient invite
email path.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Gate                                       | Verdict         | Basis                                                                                                                                        |
| ------------------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Production-Grade Quality                | ✅ PASS         | Behavior-preserving for invites; digest failure handled as best-effort (FR-007); covered by unit tests                                       |
| II. Coding Conventions                     | ✅ PASS         | Bun-only; follows existing service/template/logger patterns in `app/lib/`                                                                    |
| III. Modularity                            | ✅ PASS         | New digest template + email-service function keep the change contained; `createBulkFileInvites` only loses the per-file loop                 |
| IV. Readability & Maintainability          | ✅ PASS         | One digest send, one template, explicit naming                                                                                               |
| V. Efficiency & Optimization               | ✅ PASS         | 500 Brevo calls → 1; completion time flat vs file count                                                                                      |
| Performance Standards (no N+1, batched IO) | ✅ PASS         | Invitation + audit writes already batched (spec 002); email is a single call                                                                 |
| IO off request path                        | ✅ PASS w/ note | Single ~0.5 s Brevo call inline matches the existing single-file share precedent; background queue rejected (no infra in repo, out of scope) |
| Quality gates (lint/typecheck/format/test) | ✅ PASS         | Verified in `quickstart.md`                                                                                                                  |
| Schema change review                       | ✅ PASS (none)  | No migrations; `bun prisma migrate status` must report no drift                                                                              |
| Security review                            | ✅ PASS         | Auth/ownership paths untouched; no new secrets; no per-file data in email                                                                    |

No violations → **Complexity Tracking not required**.

_Post-Phase-1 re-check: all verdicts above still hold after the design in
`research.md` (single digest send, no schema change, audit reword + one new
free-form audit value, inline single Brevo call matching existing precedent,
HTTP contract untouched). No gate regressions._

## Project Structure

### Documentation (this feature)

```text
specs/003-share-email-digest/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions
├── data-model.md        # Phase 1 — entities (no schema change)
├── quickstart.md        # Phase 1 — validation guide
├── contracts/           # Phase 1 — invite-digest-email.md
└── tasks.md             # Phase 2 (created by /speckit.tasks)
```

### Source Code (repository root)

```text
app/lib/
├── email-templates/
│   ├── invite-email.ts          # unchanged (single-file / group / resend paths)
│   └── invite-digest-email.ts   # NEW — generic bulk-share digest template (HTML + text)
├── email-service.ts             # ADD sendInviteDigestEmailService; reuse sendBrevoEmail
├── invitation-service.ts        # ADD deliverInviteDigestEmail; createBulkFileInvites:
│                                #   remove per-file deliverInviteEmail loop (:290-305),
│                                #   send one digest when invites.length > 0 (FR-008),
│                                #   keep createManyAndReturn + audit createMany (reworded)
└── share-service.test.ts        # UPDATE bulk-invite test: 1 email (was 3); ADD 500-file → 1 email;
                                 # ADD FR-007 failure & FR-008 no-share cases
```

**Structure Decision**: Follows the existing single-project Next.js layout —
logic in `app/lib` services, templates in `app/lib/email-templates`, tests
colocated as `*.test.ts`. No new directories beyond the feature spec folder.
