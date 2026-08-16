# Package Manager & Runtime Rules

- **Strict Package Manager Constraint**: You **MUST** strictly use `bun` (not `npm`, `yarn`, or `pnpm`) for all package installation, executing scripts, and running prisma operations.
  - Install dependency: `bun add <dependency>` (dev dependency: `bun add -d <dependency>`)
  - Run package scripts: `bun run <script>` (e.g., `bun run dev`, `bun run lint`)
  - Execute Prisma commands: `bun prisma <command>` (e.g., `bun prisma db push`, `bun prisma studio`)

# Project Setup & Startup Commands

Always follow these commands to start the project and its services:

## 1. PostgreSQL Database (Supabase)

The project uses Supabase-backed PostgreSQL.

- Ensure `.env` contains valid `DATABASE_URL` (pooled connection) and `DIRECT_URL` (direct connection).

## 2. Install Project Dependencies

```bash
bun install
```

## 3. Database Migration, Client Generation & Admin Seeding

```bash
bun prisma db push
bun prisma generate
bun run db:seed
```

## 4. Run the Development Server

```bash
bun run dev
```

# Response Format

Respond in a scannable, low-cognitive-load format:

1. **Structure over prose** — use bulleted / numbered lists instead of long
   paragraphs. Reserve paragraphs for short single ideas.
2. **Lead with the answer** — put the conclusion/summary first, then details.
3. **Make status explicit** — separate short labeled sections like:
   - **Done** — what was completed
   - **Issue / Finding** — what the problem or result is
   - **Next / Question** — what's remaining or being asked
4. **Template by context** — consistent layout per task type:
   - Implementation → Done / Changes / Verification / Next
   - Bug → Symptom / Root Cause / Fix / Verification
   - Analysis → summary first, findings as bullets
   - Multi-step work → progress checklist with `[x]` / `[ ]` states
5. **Use tables** for comparisons, before/after, or field mappings.
6. **Reference code by `file:line`** instead of quoting large blocks.

<!-- graft:start -->

## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
