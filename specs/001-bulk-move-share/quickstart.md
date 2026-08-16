# Quickstart: Validating Bulk Move & Bulk Share

**Phase 1 output** — runnable validation guide. Implementation details live in
`tasks.md` (next command); this file proves the feature works end-to-end.

## Prerequisites

- `bun` installed; Supabase-backed Postgres reachable via `.env`
  (`DATABASE_URL`, `DIRECT_URL`).
- Existing app setup (per AGENTS.md):
  - `bun install`
  - `bun prisma db push` + `bun prisma generate`
  - `bun run db:seed`
- A primary user **Alice** (owner) and a second account **Bob** (recipient),
  both created/signed in. At least one group that Alice belongs to and Bob is a
  member of (create via the Groups UI), so group-share tests can run.
- Alice has ≥6 uploaded files in "My Files" (some inside a subfolder).

## Setup

```bash
bun run dev
```

Sign in as Alice at `http://localhost:3000`. Keep the "My Files" tab ("own")
active. Reference contracts: [`contracts/bulk-move.md`](contracts/bulk-move.md),
[`contracts/bulk-share.md`](contracts/bulk-share.md),
[`contracts/bulk-share-group.md`](contracts/bulk-share-group.md). Entity rules:
[`data-model.md`](data-model.md).

## Scenario 1 — Bulk move works end-to-end (existing feature, validate)

1. Click **Select**, tick 3 files + 1 folder, click **Move (4)**, pick a target
   folder (or root).
2. **Expected**: toast "4 moved!"; all 4 now inside the target; source is empty
   of them; selection cleared; file list refreshed.
3. Re-try moving a folder into one of its own subfolders.
4. **Expected**: that folder is rejected (cycle) and reported, others unaffected.
5. Cancel the destination picker on a fresh selection.
6. **Expected**: nothing moved, selection preserved.

Contract details: [`contracts/bulk-move.md`](contracts/bulk-move.md).

## Scenario 2 — Bulk share with an existing user

1. Select 3 files, click **Share**, open the **Users** tab, enter
   `bob@example.com` with permission **read**, confirm.
2. **Expected**: success message "3 shared"; no errors.
3. Sign in as Bob → "Shared" tab → all 3 files appear; Bob can preview but not
   modify.
4. Back as Alice, bulk-share the same 3 files to Bob at **write**.
5. **Expected**: no duplicates — the 3 `FilePermission` rows are updated to
   `write`, and the toast reports the count.

## Scenario 3 — Bulk share with an unknown email

1. Select 2 files, **Share** → Users tab → `newuser@example.com` (no account),
   confirm.
2. **Expected**: reported as invites (pending), invite emails attempted — matching
   single-file behavior, NOT an error.

## Scenario 4 — Bulk share with a group

1. Select 2 files, **Share** → **Groups** tab, pick the shared group with
   download disabled, confirm.
2. **Expected**: both files shared with the group.
3. Sign in as Bob (a member) → both files accessible, **previewable but not
   downloadable**.
4. Repeat the same share with download enabled.
5. **Expected**: settings updated on the same `GroupFile` rows — no duplicates.

## Scenario 5 — Authorization guard rails

1. As Bob, attempt to bulk-share or bulk-move a file owned by Alice.
2. **Expected**: `403 Forbidden`, no change to the file.
3. As Alice, share to her own email.
4. **Expected**: rejected with "You cannot share with yourself".
5. As a non-member, bulk-share a file with a group they don't belong to (Alice
   must remove them first, or test with a fresh non-member user).
6. **Expected**: `403 Forbidden` with the membership message.

## Scenario 6 — Ineligible items are reported, not dropped

1. Create/observe a file whose storage status is not `available`, include it in a
   bulk move and a bulk share.
2. **Expected**: it lands in the skipped bucket with a reason; the remaining
   items succeed; the UI reports "N moved, 1 skipped" / "N shared, 1 skipped".

## Quality gates (must pass before merge)

```bash
bun run lint
bun run typecheck
bun run build
```

Expected: zero errors. See [`plan.md`](plan.md) Constitution Check for how these
map to the project constitution.
