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
