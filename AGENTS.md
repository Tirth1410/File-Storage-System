# Package Manager & Runtime Rules

- **Strict Package Manager Constraint**: You **MUST** strictly use `bun` (not `npm`, `yarn`, or `pnpm`) for all package installation, executing scripts, and running prisma operations.
  - Install dependency: `bun add <dependency>` (dev dependency: `bun add -d <dependency>`)
  - Run package scripts: `bun run <script>` (e.g., `bun run dev`, `bun run lint`)
  - Execute Prisma commands: `bun prisma <command>` (e.g., `bun prisma db push`, `bun prisma studio`)

# Project Setup & Startup Commands

Always follow these commands to start the project and its services:

## 1. Start the PostgreSQL Database (Docker)

The database runs in a Docker container using the local `Dockerfile` in the project root.

- **Build the database image**:
  ```bash
  docker build -t postgresdb .
  ```
- **Run the container (if creating for the first time)**:
  ```bash
  docker run --name postgresdb-container -p 5432:5432 -d postgresdb
  ```
- **Start the container (if it already exists but is stopped)**:
  ```bash
  docker start postgresdb-container
  ```

## 2. Install Project Dependencies

```bash
bun install
```

## 3. Database Migration & Client Generation

```bash
bun prisma migrate dev
bun prisma generate
```

## 4. Run the Development Server

```bash
bun run dev
```
