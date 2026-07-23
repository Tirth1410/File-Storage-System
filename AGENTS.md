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
