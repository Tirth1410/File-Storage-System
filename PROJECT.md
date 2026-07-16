# File Storage System Project

This document serves as the **single source of truth** for the File Storage System project. It outlines the project's purpose, architecture, database schema, implemented features, key workflows, and coding conventions based on the actual codebase.

---

## 1. Purpose & Overview

The File Storage System is a production-correct file storage web application designed to allow authenticated users to upload, download, preview, share, and delete documents and media files.

The system utilizes a **direct-to-storage architecture**, where large file uploads (up to 1 GB) bypass the Next.js server entirely, uploading chunks directly from the client browser to Cloudflare R2 (or any S3-compatible storage) using short-lived presigned URLs. Shared links and permissions-based access are resolved securely via the application backend.

---

## 2. Currently Implemented Features

The project is built and fully functional with the following features:

### Authentication & Authorization

- **Better Auth Integration**: Utilizes `better-auth` (v1.6.23) for session management and authorization.
- **Authentication Methods**: Supports both standard Email/Password credentials and Google OAuth.
- **Database Hooks**: Automatically updates user roles to `admin` upon registration or session creation if their ID is specified in the `ADMIN_USER_IDS` environment variable.
- **Shared Permissions Model**: Restricts access to files. Files can be private, shared via tokenized links, shared directly with other registered users via their email addresses, or shared with groups.
- **Group Sharing & Collaboration**: Enables users to create groups, manage group memberships with specific roles (Owner, Admin, Member), and share files with one or more groups simultaneously under distinct preview and download capabilities.

### Main File Dashboard (`/dashboard`)

- **Tabbed Dashboard**: Separate tabs for **My Files** (owned files) and **Shared with Me** (files other users have shared).
- **Direct Multipart Upload UI**:
  - Allows selecting files up to 1 GB.
  - Uploads file chunks concurrently (limit: 3) directly to Cloudflare R2.
  - Shows real-time progress, upload speed (MB/s), and ETA (seconds).
  - Supports canceling/aborting an active upload (cleans up unfinished R2 parts).
  - Automatically retries failed chunk uploads (up to 3 times per chunk).
- **Download**: Downloads files by requesting a short-lived presigned GET URL.
- **Native Browser Preview**: Opens a modal in-page using standard browser capabilities for supported types (images, videos, PDFs) via an `inline` presigned GET URL.
- **File Sharing (ShareModal)**:
  - **Secure Share Links**: Generates unique share tokens with custom parameters (Allow Preview, Allow Download, and optional Expiration Dates).
  - **User Permissions**: Allows assigning direct access to other users via email address.
- **File Deletion**: Permanently deletes a file from object storage and deletes its database metadata, releasing the user's quota.

### Guest / Public Share Page (`/s/[token]`)

- **Public and Authenticated Access**: Resolves file preview and download for users using a tokenized sharing link.
- **Granular Security Enforcement**: Respects link status (`isActive`), link expirations (`expiresAt`), and permission restrictions (`allowPreview`, `allowDownload`).

### Quota & Usage Tracking

- **Transactional Safety**: Uses transactional row-level locking (`FOR UPDATE` raw SQL queries) to prevent race conditions during concurrent uploads.
- **Allocated Quota**: Default quota is **2 GB** per user (configurable by admin).
- **Usage Display**: Interactive progress bar in dashboard, profile page, and admin view displaying utilization.

### Admin Control Panel (`/admin`)

- **Dashboard Observability**: Displays total storage allocated vs. used, utilization percentage, active/deleted file counts, average file size, success/failure rates for uploads and downloads, registered user counts, and counts of users nearing or exceeding their quotas.
- **User Directory**: Lists all registered users, display pictures, quota usage, status (Active/Banned), and role (Admin/User).
- **Banning/Suspension**: Admin can ban or unban users via the Better Auth admin plugin helper client.
- **Role Toggles**: Toggle role between `admin` and `user`.
- **Quota Management**: Modify a user's storage quota in gigabytes (updates the DB in bytes).

### User Profile Page (`/profile`)

- **Storage Insights**: Displays detailed quota information, active file counts, and overall storage usage.
- **Audit Logs View**: Lists recent user-centric audit logs (e.g. file uploads, downloads, sharing configurations).

### System Auditing & Observability

- **Centralized Logger**: Context-based logging utility ([logger.ts](file:///b:/file-store/File-Storage-System/app/lib/logger.ts)) with levels (`INFO`, `WARN`, `ERROR`, `DEBUG`). Automatically wraps API endpoints using `withLogging` to print request/response durations, methods, statuses, and exceptions.
- **Audit Logging**: Keeps an audit log table of core operations including:
  - `upload_initiated`, `upload_success`, `upload_aborted`, `upload_expired`
  - `download_requested`, `download_success`, `download_failed`
  - `file_deleted`

### Cleanup Job (`/api/cron/cleanup`)

- **Orphan Cleanup**: Cron-triggered endpoint that scans and cleans up expired upload sessions, aborts incomplete multipart uploads on R2, and marks corresponding files as failed in the DB.

---

## 3. Technology Stack

### Core Frameworks

- **Runtime**: Bun (v1.x)
- **Framework**: Next.js (v16.2.10) using App Router & React (v19.2.4)
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
├── .agent/                   # Custom agent configurations (rules, skills, workflows)
├── app/                      # Next.js App Router root
│   ├── admin/                # Admin Portal UI page
│   │   └── page.tsx          # Admin control dashboard displaying metrics and directory
│   ├── api/                  # Backend Route Handlers
│   │   ├── admin/            # Admin stats & user quota endpoints
│   │   │   ├── stats/        # Aggregates overall system statistics
│   │   │   │   └── route.ts
│   │   │   └── users/        # User detail and quota modification endpoints
│   │   │       └── [id]/
│   │   │           ├── quota/
│   │   │           │   └── route.ts
│   │   │           └── route.ts
│   │   ├── auth/             # Better Auth Next.js handlers
│   │   ├── cron/             # Upload session cleanup endpoint
│   │   │   └── cleanup/
│   │   │       └── route.ts
│   │   ├── files/            # File management, upload lifecycle, and permissions/share link actions
│   │   │   ├── [id]/         # Operations specific to a file
│   │   │   │   ├── download-url/  # Requests presigned read URLs (preview/download)
│   │   │   │   │   └── route.ts
│   │   │   │   ├── groups/        # Manages group sharing configuration for a file
│   │   │   │   │   ├── [groupId]/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   ├── permissions/   # Assigns or revokes specific user permissions
│   │   │   │   │   ├── [userId]/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   ├── share/         # Manages tokenized sharing links
│   │   │   │   │   ├── [linkId]/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── abort-upload/  # Cancels/aborts an active multipart upload
│   │   │   │   └── route.ts
│   │   │   ├── complete-upload/ # Finalizes multipart upload in R2 and updates DB
│   │   │   │   └── route.ts
│   │   │   ├── initiate-upload/ # Quota check and multipart initialization
│   │   │   │   └── route.ts
│   │   │   ├── sign-part/     # Requests presigned URL for a single upload part
│   │   │   │   └── route.ts
│   │   │   └── route.ts       # Fetches files owned by or shared with the user
│   │   ├── groups/           # Group management and member endpoints
│   │   │   ├── [groupId]/
│   │   │   │   ├── members/
│   │   │   │   │   ├── [memberUserId]/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── profile/          # User quota utilization stats API
│   │   │   └── route.ts
│   │   └── s/                # Public/authenticated access via share links
│   │       └── [token]/      # Resolves files using active share link tokens
│   │           └── route.ts
│   ├── components/           # Reusable UI components
│   │   ├── dashboard/        # Dashboard sub-components
│   │   │   ├── FileIcon.tsx  # Helper to display mime-type specific icons
│   │   │   ├── FileListItem.tsx # Renders a file list row with download/share/delete options
│   │   │   └── UploadPanel.tsx # Multipart upload UI with progress, speed, and cancel capabilities
│   │   └── shared/           # Shared layout and UI helpers
│   │       ├── AppShell.tsx   # Top/side navigation bar layout wrapped in Klein Blue theme
│   │       ├── LoadingScreen.tsx # Uniform loading spinner
│   │       ├── Logo.tsx       # Standard brand logo
│   │       ├── SectionCard.tsx # Clean card wrapper
│   │       ├── ShareModal.tsx # Redesigned sharing popup for links and user permissions
│   │       ├── StatCard.tsx   # Displays key-value numbers (e.g. storage, counts)
│   │       ├── StatusBadge.tsx # Standardized status badge (e.g. success, error)
│   │       └── StorageBar.tsx # Visual indicator for user storage quota usage
│   ├── dashboard/            # Main User Dashboard page
│   │   └── page.tsx
│   ├── generated/            # Output directory for Prisma Client
│   ├── globals.css           # Global CSS styles including custom utility overrides
│   ├── groups/               # User Groups management page
│   │   └── page.tsx
│   ├── layout.tsx            # Main layout wrapper
│   ├── page.tsx              # Public-facing home/landing page
│   ├── profile/              # User profile page displaying storage usage and audit metrics
│   │   └── page.tsx
│   ├── s/                    # Guest/authenticated share link routing
│   │   └── [token]/          # Share link viewer and downloader interface
│   │       └── page.tsx
│   ├── sign-in/              # Credentials and Google social sign-in page
│   │   └── page.tsx
│   └── sign-up/              # Credentials registration page
│       └── page.tsx
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

Defined in [schema.prisma](file:///b:/file-store/File-Storage-System/prisma/schema.prisma).

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
    share_link {
        string id PK
        string fileId FK
        string token UK
        boolean isActive
        datetime expiresAt
        boolean allowDownload
        boolean allowPreview
        datetime createdAt
        datetime updatedAt
    }
    file_permission {
        string id PK
        string fileId FK
        string userId FK
        string permission
        datetime createdAt
        datetime updatedAt
    }
    group {
        string id PK
        string name
        string description
        string ownerUserId FK
        boolean isArchived
        datetime createdAt
        datetime updatedAt
    }
    group_member {
        string id PK
        string groupId FK
        string userId FK
        string role
        datetime joinedAt
    }
    group_file {
        string id PK
        string groupId FK
        string fileId FK
        string sharedByUserId FK
        boolean allowPreview
        boolean allowDownload
        boolean isActive
        datetime sharedAt
        datetime updatedAt
    }

    user ||--o{ session : "has"
    user ||--o{ account : "has"
    user ||--o| quota_usage : "defines"
    user ||--o{ audit_log : "performs"
    user ||--o{ file_permission : "has"
    user ||--o{ group : "owns"
    user ||--o{ group_member : "belongs"
    user ||--o{ group_file : "shares"
    file ||--o{ upload_session : "spawns"
    file ||--o{ share_link : "has"
    file ||--o{ file_permission : "has"
    file ||--o{ group_file : "shared_in"
    group ||--o{ group_member : "has"
    group ||--o{ group_file : "has"
```

### Models Summary

- **User**: Better Auth schema extended with `role`, `banned`, `banReason`, and `banExpires`. Role is `admin` or default.
- **Session & Account & Verification**: Standard Better Auth entities mapping active user logins and social providers.
- **File**: Stores object storage details, mime-type, original filename, status (`uploading`, `available`, `failed`, `deleted`), and group settings.
- **UploadSession**: Represents an active multipart upload session. Maps a `storageUploadId` issued by Cloudflare R2 and tracks status (`initiated`, `uploading`, `completed`, `aborted`, `expired`, `failed`).
- **QuotaUsage**: Maintains storage usage per user. Defaults to 2 GB (`2147483648` bytes).
- **AuditLog**: Stores structural activity logs tracking downloads, deletions, and upload phases.
- **ShareLink**: Stores tokenized sharing configurations enabling public preview and download access based on expiration or flag rules.
- **FilePermission**: Grants granular user-to-user access (`read` or `write` permission override) for a specific file.
- **Group**: Represents a collection of users with a group owner and options for archiving.
- **GroupMember**: Junction model representing group memberships, containing user roles (`OWNER`, `ADMIN`, `MEMBER`).
- **GroupFile**: Junction model mapping which files are shared with which groups, along with granular access settings (`allowPreview`, `allowDownload`, `isActive`).

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

### 6.2 Access Verification & Download Flow

No object storage buckets are publicly accessible. Access to files goes through the application backend.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Browser
    participant API as Next.js Server
    participant AuthSvc as Authorization Service
    participant DB as Postgres (Prisma)
    participant Storage as Cloudflare R2

    Client->>API: GET /api/files/[id]/download-url?download=true|false
    activate API
    API->>AuthSvc: canAccessFile(fileId, userId, token, requiredAccess)
    activate AuthSvc
    AuthSvc->>DB: Query File & Permissions / ShareLink
    DB-->>AuthSvc: Return access entity checks
    AuthSvc-->>API: Return access validation result
    deactivate AuthSvc

    alt Unauthorized
        API-->>Client: Return 403 Forbidden
    else Authorized
        API->>Storage: s3Client.send(GetObjectCommand with Disposition details)
        Storage-->>API: Return short-lived presigned GET URL
        API->>DB: Log Audit Event: download_success
        API-->>Client: Return signed URL
    end
    deactivate API
```

1. **Request**: Browser requests a read URL from `GET /api/files/[id]/download-url?download=true|false`.
2. **Access Check**: Server invokes the `canAccessFile` method from [authorization-service.ts](file:///b:/file-store/File-Storage-System/app/lib/authorization-service.ts) to verify permissions.
   - Access is permitted if:
     - The user is the owner of the file.
     - The user is an administrator.
     - The user is granted explicit access via the `FilePermission` table.
     - A valid, active, non-expired `ShareLink` token is provided that allows preview/download.
3. **Presign**: Server requests a short-lived presigned GET URL from Cloudflare R2 (expires in 3600 seconds) via `GetObjectCommand`.
   - If `download=true`, Content-Disposition is set as `attachment; filename="..."`.
   - If `download=false` (used for previewing), Content-Disposition is set as `inline; filename="..."`.
4. **Log & Return**: Server writes an audit log (`download_success`) and returns the signed URL to the browser.
5. **Consumption**: Browser uses the signed URL to display files inside an `iframe`, `video` tag, or downloads the file natively.

### 6.3 Centralized Logging Request Lifecycle

All major endpoints are wrapped with `withLogging` from [logger.ts](file:///b:/file-store/File-Storage-System/app/lib/logger.ts). When a request is received, it:

1. Generates/inherits a logger context.
2. Logs `REQUEST: [method] [url]`.
3. Monitors execution time.
4. Logs `RESPONSE: [method] [url] - Status [status] - [duration]ms` upon completion, or reports errors using the error-level logger.

### 6.4 Cleanup Cron Job

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
- **Separation of Concerns**: Keep API routes thin. Centralize database logic and external S3 interactions within `app/lib/` service modules (`fileService`, `r2Service`, `adminService`, `auditService`, `shareService`, `authorizationService`).
- **Prisma Generated Output**: Prisma Client output is configured to write to the `app/generated/prisma` directory (see [schema.prisma](file:///b:/file-store/File-Storage-System/prisma/schema.prisma)). Remember to reference imports correctly.
- **Sleek Aesthetic & Design System**: Utilize color variables from [tokens.ts](file:///b:/file-store/File-Storage-System/app/lib/tokens.ts) ("Klein Blue" theme) to keep user interfaces consistent, using custom components (e.g. `AppShell`, `SectionCard`, `StatusBadge`).

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

1. **Redis Cache & Rate Limiting**: The project contains no Redis database integrations or rate-limiting packages (e.g. Upstash). This remains as a future scalability item.
2. **Advanced Permissions**: Future expansions could support group-based folder organization, nested groups, and inheritance logic.
