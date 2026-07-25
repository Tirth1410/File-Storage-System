# File Storage System

A modern file storage web application built with Next.js, Better Auth, and Prisma.

## Prerequisites 

Before starting, ensure you have the following installed:

- Bun (JavaScript runtime and package manager)
- PostgreSQL database

## Getting Started

Follow these steps to set up and run the project locally.

### 1. Install Dependencies

Install the project dependencies using Bun:

```bash
bun install
```

### 2. Configure Environment Variables

Copy the example environment file to create your own configuration:

```bash
cp .env.example .env
```

Open `.env` and fill in the required environment variables:

- `BETTER_AUTH_SECRET`: A secure secret key for Better Auth session management.
- `BETTER_AUTH_URL`: The base URL of your application (typically `http://localhost:3000`).
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: OAuth credentials from the Google Cloud Console.
- `DATABASE_URL`: Your PostgreSQL database connection string.

### 3. Database Migration and Client Generation

Run the database migrations and generate the Prisma Client using Bun:

```bash
bun prisma migrate dev
bun prisma generate
```

### 4. Run the Development Server

Start the Next.js development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view and interact with the application.

## Technologies Used

- Next.js: React framework for server-rendered applications
- Better Auth: Authentication solution supporting email/password and social login providers
- Prisma: Type-safe ORM for database modeling and queries
- PostgreSQL: Relational database system
