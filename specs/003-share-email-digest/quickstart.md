# Quickstart — Validating the Bulk Share Email Digest

**Feature**: `specs/003-share-email-digest` | **Date**: 2026-08-16
**Purpose**: Runnable validation scenarios proving the feature end-to-end.
Implementation details live in `plan.md`, `research.md`, `data-model.md`, and
`contracts/invite-digest-email.md` — this is a validation/run guide only.

## Prerequisites

- Supabase-backed PostgreSQL running, `.env` populated with `DATABASE_URL`
  (pooled), `DIRECT_URL` (direct), and `BREVO_API_KEY` (to observe real
  delivery in S1–S4; the share itself works without it, FR-007).
- Project bootstrapped:

```bash
bun install
bun prisma db push
bun prisma generate
bun run db:seed
```

- Dev server:

```bash
bun run dev
```

- A logged-in account with a library of **at least 500 files** (all `status:
"available"`), and a test inbox you can read (e.g. an unregistered
  `recipient@example.com`).

## Automated checks

```bash
bun run typecheck   # must pass
bun run lint        # must pass
bun test            # unit tests below
bun prisma migrate status  # must report no schema drift (no migrations expected)
```

Unit tests to expect (updated/added alongside the change; see `plan.md`):

- `share-service.test.ts` — **update**: the "unregistered recipients" bulk
  invite test asserts `state.emailSends === 1` (was 3) and 3 invites still
  created (FR-004).
- `share-service.test.ts` — **add**: bulk-sharing 500 files to an unregistered
  recipient results in exactly **1** email send and 500 invites (SC-001,
  FR-001/FR-004).
- `share-service.test.ts` — **add**: a 500-file share to an unregistered
  recipient completes (no per-file email loop); completion is one digest send
  regardless of count (SC-002 structural proxy — latency is asserted manually
  in S2).
- `share-service.test.ts` — **add**: digest delivery failure → share still
  succeeds, invites intact, `emailSent: false` on all entries (FR-007).
- `share-service.test.ts` — **add**: all files skipped/forbidden/not-found →
  zero email sends (FR-008).

## Manual validation scenarios

### S1 — 500 files → exactly 1 email (SC-001, FR-001/FR-005)

1. In the dashboard, select all 500 files and share them to an
   **unregistered** email you can read.
2. Wait for completion, then check the test inbox.
3. **Expected**: exactly **one** notification email (subject
   "Files have been shared with you on Vault"); body states files were shared,
   contains no file names, no file count, and one "Join Vault" link.

### S2 — Bulk share completes in a few seconds (SC-002)

1. Time the same 500-file share from S1 (browser network tab or `time curl` on
   `POST /api/files/bulk-share`).
2. **Expected**: completion in **under 10 s**, dominated by the single Brevo
   call (~0.5 s), not 500 calls (~55 s).
3. Compare a 10-file share vs a 500-file share to the same recipient —
   completion time is comparable, not ~50× (US2).

### S3 — Single-file bulk share still notifies (US3)

1. Share exactly **1** file to an unregistered email.
2. **Expected**: exactly one digest email; wording is correct at a count of one
   (no pluralization issues, since no count is mentioned).

### S4 — Re-sharing sends one new email per action (SC-005, FR-006)

1. Share 100 files to an unregistered email → 1 email.
2. Share 50 **more** files to the same email → exactly 1 new email (total 2).
3. **Expected**: the second email is one digest for the new action; the pending
   invites from both actions remain acceptable together.

### S5 — Nothing-shared sends no email (FR-008)

1. Attempt a share where every selected file is skipped (e.g. all not owned /
   not available / owned by recipient).
2. **Expected**: no notification email is delivered; invites reflect only
   actually-shared files.

### S6 — Sign-up + acceptance still works (FR-003, SC-003)

1. Share 500 files to an unregistered email, then click "Join Vault" from the
   digest and create an account (email pre-fills from the link).
2. **Expected**: all 500 pending shares appear and are individually acceptable —
   no dependency on the digest having listed them (100% acceptance, SC-003).

## Contract & data-model references

- Email contract (subject/body/tags/CTA): `contracts/invite-digest-email.md`.
- No schema change; entities and the new audit value:
  `data-model.md`.
