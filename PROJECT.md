# File Storage System Project

This document serves as the **single source of truth** for the File Storage System project. It outlines the project's purpose, architecture, database schema, implemented features, key workflows, and coding conventions based on the actual codebase.

---

## 1. Purpose & Overview

The File Storage System is a production-correct file storage web application designed to allow authenticated users to upload, download, preview, and delete documents and media files.

The system utilizes a **direct-to-storage architecture**, where large file uploads (up to 1 GB) bypass the Next.js server entirely, uploading chunks directly from the client browser to Cloudflare R2 (or any S3-compatible storage) using short-lived presigned URLs.

---

## 2. Currently Implemented Features

The project is built and fully functional with the following features:

### Authentication & Authorization

- **Better Auth Integration**: Utilizes `better-auth` (v1.6.23) for session management and authorization.
- **Authentication Methods**: Supports both standard Email/Password credentials and Google OAuth.
- **Database Hooks**: Automatically updates user roles to `admin` upon registration or session creation if their ID is specified in the `ADMIN_USER_IDS` environment variable.

### Main File Dashboard (`/dashboard`)

- **File Management List**: Shows the list of available files uploaded by the authenticated user.
- **Direct Multipart Upload UI**:
  - Allows selecting files up to 1 GB.
  - Uploads file chunks concurrently (limit: 3) directly to Cloudflare R2.
  - Shows real-time progress, upload speed (MB/s), and ETA (seconds).
  - Supports canceling/aborting an active upload (cleans up unfinished R2 parts).
  - Automatically retries failed chunk uploads (up to 3 times per chunk).
- **Download**: Downloads the selected file by requesting a short-lived presigned GET URL.
- **Native Browser Preview**: Opens a modal in-page using standard browser capabilities for supported types (images, videos, PDFs) via an `inline` presigned GET URL.
- **File Deletion**: Permanently deletes a file from object storage and deletes its database metadata, releasing the user's quota.

### Quota & Usage Tracking

- **Transactional Safety**: Uses transactional row-level locking (`FOR UPDATE` raw SQL queries) to prevent race conditions during concurrent uploads.
- **Allocated Quota**: Default quota is **2 GB** per user (configurable by admin).
- **Usage Display**: Interactive progress bar in dashboard and profile page displaying utilization.

### Admin Control Panel (`/admin`)

- **Dashboard Observability**: Displays total storage allocated vs. used, utilization percentage, active/deleted file counts, average file size, success/failure rates for uploads and downloads, registered user counts, and counts of users nearing or exceeding their quotas.
- **User Directory**: Lists all registered users.
- **Banning/Suspension**: Admin can ban or unban users via Better Auth admin plugin helper client.
- **Role Toggles**: Toggle role between `admin` and `user`.
- **Quota Management**: Modify a user's storage quota in gigabytes (updates the DB in bytes).

### System Auditing & Observability

- **Audit Logging**: Keeps an audit log table of core operations including:
  - `upload_initiated`, `upload_success`, `upload_aborted`, `upload_expired`
  - `download_requested`, `download_success`, `download_failed`
  - `file_deleted`

### Cleanup Job (`/api/cron/cleanup`)

- **Orphan Cleanup**: Cron-triggered endpoint that scans and cleanups expired upload sessions, aborts incomplete multipart uploads on R2, and marks corresponding files as failed in the DB.

---

## 3. Technology Stack

### Core Frameworks

- **Runtime**: Bun (v1.x)
- **Framework**: Next.js (v16.2.10) using App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS (v4) using `@tailwindcss/postcss`
- **Database client**: Prisma ORM (v7.8.0)
- **Database**: PostgreSQL

### Authentication

- **Library**: Better Auth (v1.6.23) with `admin` plugin

### Object Storage Client

- **SDK**: AWS SDK S3 client (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) connected to Cloudflare R2

---

## 4. Directory Structure

```txt
file-storage-system/
├── app/                      # Next.js App Router root
│   ├── admin/                # Admin Portal UI page
│   ├── api/                  # Backend Route Handlers
│   │   ├── admin/            # Admin stats & user quota endpoints
│   │   ├── auth/             # Better Auth Next.js handlers
│   │   ├── cron/             # Upload session cleanup endpoint
│   │   ├── files/            # File upload initialization, chunk signing, completion, and download endpoints
│   │   └── profile/          # User stats summary for profile page
│   ├── dashboard/            # Main User Dashboard page
│   ├── generated/            # Output directory for Prisma Client
│   ├── lib/                  # Services and core business logic
│   │   ├── admin-service.ts  # Stats aggregation & user details lookup
│   │   ├── audit-service.ts  # Unified database audit log writer
│   │   ├── auth-client.ts    # Client-side Better Auth SDK
│   │   ├── auth.ts           # Server-side Better Auth configuration
│   │   ├── file-service.ts   # Core upload orchestration and DB locking logic
│   │   ├── prisma.ts         # Prisma client instantiation with PostgreSQL adapter
│   │   └── r2.ts             # Cloudflare R2 wrapper (AWS S3 commands & presigning)
│   ├── profile/              # User profile page
│   ├── sign-in/              # Credentials and Google social sign-in page
│   ├── sign-up/              # Credentials registration page
│   ├── globals.css           # Global Tailwind CSS styles
│   └── layout.tsx            # Main layout wrapper
├── prisma/                   # Prisma Schema & Database Configuration
│   ├── configure-r2.ts       # Script to verify R2 bucket existence and configure CORS rules
│   ├── migrations/           # Database migration files
│   └── schema.prisma         # Database models definition
├── package.json              # Project dependencies and script runner configurations
├── bun.lock                  # Bun lockfile
└── tsconfig.json             # TypeScript configuration
```

---

## 5. Database Schema

Defined in `prisma/schema.prisma`.

```mermaid
erDiagram
    user {
        string id PK
        string name
        string email UK
        boolean emailVerified
        string image
        datetime createdAt
        datetime updatedAt
        string role
        boolean banned
        string banReason
        datetime banExpires
    }
    session {
        string id PK
        datetime expiresAt
        string token UK
        datetime createdAt
        datetime updatedAt
        string ipAddress
        string userAgent
        string userId FK
        string impersonatedBy
    }
    account {
        string id PK
        string accountId
        string providerId
        string userId FK
        string accessToken
        string refreshToken
        string idToken
        datetime accessTokenExpiresAt
        datetime refreshTokenExpiresAt
        string scope
        string password
        datetime createdAt
        datetime updatedAt
    }
    verification {
        string id PK
        string identifier
        string value
        datetime expiresAt
        datetime createdAt
        datetime updatedAt
    }
    file {
        string id PK
        string ownerUserId
        string groupId
        string bucket
        string objectKey
        string originalName
        string mimeType
        bigint sizeBytes
        string status
        string visibility
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }
    upload_session {
        string id PK
        string fileId FK
        string userId
        string storageUploadId
        string objectKey
        bigint sizeBytes
        bigint partSizeBytes
        string status
        datetime createdAt
        datetime expiresAt
        datetime completedAt
    }
    quota_usage {
        string userId PK
        bigint quotaBytes
        bigint usedBytes
        datetime updatedAt
    }
    audit_log {
        string id PK
        string userId FK
        string action
        string fileId
        string details
        datetime createdAt
    }

    user ||--o{ session : "has"
    user ||--o{ account : "has"
    user ||--o| quota_usage : "defines"
    user ||--o{ audit_log : "performs"
    file ||--o{ upload_session : "spawns"
```

### Models Summary

- **User**: Better Auth schema extended with `role`, `banned`, `banReason`, and `banExpires`. Role is `admin` or default.
- **Session & Account & Verification**: Standard Better Auth entities mapping active user logins and social providers.
- **File**: Stores object storage details, mime-type, original filename, and states (`uploading`, `available`, `failed`, `deleted`).
- **UploadSession**: Represents an active multipart upload session. Maps a `storageUploadId` issued by Cloudflare R2 and tracks status (`initiated`, `uploading`, `completed`, `aborted`, `expired`, `failed`).
- **QuotaUsage**: Maintains storage usage per user. Defaults to 2 GB (`2147483648` bytes).
- **AuditLog**: Stores structural activity logs tracking downloads, deletions, and upload phases.

---

## 6. Architectural Principles & Critical Workflows

### 6.1 The Large Upload Rule (Direct Upload Flow)

Large files (up to 1 GB) must never stream through the Next.js server. The backend serves only as an authenticator and orchestrator.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Browser
    participant API as Next.js Server
    participant DB as Postgres (Prisma)
    participant Storage as Cloudflare R2

    Client->>API: POST /api/files/initiate-upload (name, size, type)
    activate API
    API->>DB: Begin Transaction & Lock user's quotaUsage row (FOR UPDATE)
    DB-->>API: Row Locked, available quota verified
    API->>DB: Create File record (status: uploading)
    API->>Storage: s3Client.send(CreateMultipartUploadCommand)
    Storage-->>API: Returns storageUploadId
    API->>DB: Create upload_session record (status: initiated)
    API->>DB: Log Audit Event: upload_initiated
    API-->>Client: Returns uploadId, objectKey, partSizeBytes (8MB)
    deactivate API

    Note over Client, Storage: Client uploads chunks concurrently

    loop For each part in file
        Client->>API: POST /api/files/sign-part (uploadId, objectKey, partNumber)
        API-->>Client: Returns short-lived presigned PUT URL
        Client->>Storage: PUT chunk data directly using signed URL
        Storage-->>Client: Returns ETag header
    end

    Client->>API: POST /api/files/complete-upload (uploadId, objectKey, parts: [{partNumber, etag}])
    activate API
    API->>Storage: s3Client.send(CompleteMultipartUploadCommand)
    Storage-->>API: Success response
    API->>DB: Begin Transaction & Lock user's quotaUsage row (FOR UPDATE)
    API->>DB: Update quotaUsage.usedBytes += file.sizeBytes
    API->>DB: Update upload_session (status: completed)
    API->>DB: Update file (status: available)
    API->>DB: Log Audit Event: upload_success
    API-->>Client: Returns { success: true, fileId }
    deactivate API
```

### 6.2 View / Download URL Flow

No object storage buckets are publicly accessible. Access to files goes through the application backend.

1. **Request**: Browser requests a read URL from `GET /api/files/[id]/download-url?download=true|false`.
2. **Access Check**: Server verifies that the file exists, has a status of `available`, and is owned by the requesting authenticated user.
3. **Presign**: Server requests a short-lived presigned GET URL from Cloudflare R2 (exipres in 3600 seconds) via `GetObjectCommand`.
   - If `download=true`, Content-Disposition is set as `attachment; filename="..."`.
   - If `download=false` (used for previewing), Content-Disposition is set as `inline; filename="..."`.
4. **Log & Return**: Server writes an audit log (`download_requested` / `download_success`) and returns the signed URL to the browser.
5. **Consumption**: Browser uses the signed URL to display files inside an `iframe`, `video` tag, or downloads the file natively.

### 6.3 Cleanup Cron Job

1. **Trigger**: `/api/cron/cleanup` is hit (protected by an optional `CRON_SECRET` search parameter).
2. **Retrieve**: Queries all `UploadSession` records with status `initiated` or `uploading` that have passed their `expiresAt` timestamp.
3. **Cleanup**: For each expired session:
   - Calls R2 `AbortMultipartUploadCommand` to delete accumulated chunk data.
   - Updates `UploadSession` status to `expired`.
   - Updates `File` status to `failed` and sets `deletedAt`.
   - Logs `upload_expired` to the `AuditLog` table.

---

## 7. Environment & Configuration

The application expects the following configuration in `.env` (refer to `.env.example`):

| Variable Name          | Description                                            | Example Value                                   |
| :--------------------- | :----------------------------------------------------- | :---------------------------------------------- |
| `BETTER_AUTH_SECRET`   | Secure secret key for Better Auth session signing      | _High-entropy hash_                             |
| `BETTER_AUTH_URL`      | Base URL of the running Next.js app                    | `http://localhost:3000`                         |
| `GOOGLE_CLIENT_ID`     | Google Client ID for OAuth login                       | `76472721...apps.googleusercontent.com`         |
| `GOOGLE_CLIENT_SECRET` | Google Client Secret for OAuth login                   | `GOCSPX-...`                                    |
| `DATABASE_URL`         | PostgreSQL database connection string                  | `postgresql://user:pass@localhost:5432/db`      |
| `ACCESS_KEY`           | Cloudflare R2 Access Key ID                            | `9a84a3c71f45345...`                            |
| `SECRET_ACCESS_KEY`    | Cloudflare R2 Secret Access Key                        | `42ebd7191d5...`                                |
| `S3_URL`               | Cloudflare R2 endpoint URL                             | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_BUCKET`            | The name of the Cloudflare R2 bucket                   | `file-storage-system`                           |
| `ADMIN_USER_IDS`       | Comma-separated user IDs seeded as admin on login      | `user-uuid-1,user-uuid-2`                       |
| `CRON_SECRET`          | Secret token to authenticate the cleanup cron endpoint | `my_cron_secret`                                |

### Cloudflare R2 CORS Rules

To support browser direct uploading, the R2 bucket must be configured to allow chunked uploads. You can apply the CORS configuration by running:

```bash
bun run prisma/configure-r2.ts
```

This script checks/creates the bucket and configures CORS to expose the `ETag` header, which is essential for client-side multipart completion.

---

## 8. Coding Conventions & Development Workflow

### Development Rules

- **No Large Server Transfers**: File bytes must never pass through Next.js server memory. Direct-to-storage upload must be preserved.
- **Quota Lock**: Quota manipulation must always occur inside a Prisma database transaction using a row-level write lock (`FOR UPDATE` SQL queries) to prevent multi-upload race conditions from exceeding the quota.
- **Separation of Concerns**: Keep API routes thin. Centralize database logic and external S3 interactions within `app/lib/` service modules (`fileService`, `r2Service`, `adminService`, `auditService`).
- **Prisma Generated Output**: Prisma Client output is configured to write to the `app/generated/prisma` directory (see `prisma/schema.prisma`). Remember to reference imports correctly.

### Common CLI Tasks

- **Install dependencies**: `bun install`
- **Run local server**: `bun run dev`
- **Generate Prisma Client**: `bun prisma generate`
- **Deploy DB migrations**: `bun prisma migrate dev`
- **Expose CORS / Configure R2**: `bun run prisma/configure-r2.ts`
- **Type-check codebase**: `bun run typecheck`
- **Format codebase**: `bun run format`

---

## 9. Removed Obsolete Drafts / Future Roadmap

The previous documentation draft outlined several specs which are **NOT currently implemented** in the codebase. They remain as potential features on the future roadmap:

1. **User Groups & Group-based Sharing**: There are currently no models for `Group` or `GroupMember` in `schema.prisma`. All uploaded files are strictly owner-private.
2. **File Permissions Table**: Ad-hoc viewer/admin overrides are not present. Only the file owner and system admins have delete/read access.
3. **Shareable Links**: Public share tokens or hash token verification endpoints are not implemented.
4. **Redis Cache & Rate Limiting**: The project contains no Redis database integrations or rate-limiting packages (e.g. Upstash).
