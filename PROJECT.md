# File Storage System Project

This document serves as the **single source of truth** for the File Storage System project ("Vault"). It outlines the project's purpose, architecture, database schema, implemented features, key workflows, and coding conventions based on the actual codebase.

---

## 1. Purpose & Overview

Vault is a production-correct file storage web application designed to allow authenticated users to upload, download, preview, share, and delete documents and media files.

The system utilizes a **direct-to-storage architecture**, where large file uploads (up to 200 MB) bypass the Next.js server entirely, uploading chunks directly from the client browser to Cloudflare R2 (or any S3-compatible storage) using short-lived presigned URLs. Shared links and permissions-based access are resolved securely via the application backend.

It also integrates a cloud-native **Upstash Redis infrastructure** for session management via `better-auth` secondary storage and Sliding Window Counter rate limiting on authentication routes.

Transactional email (verification + invites) is delivered through **Brevo** (Sendinblue), and the application includes folder organization, server-side pagination, pending email invitations that auto-grant access on signup, bulk file/folder operations, an interactive product tour, and Vercel Web Analytics.

---

## 2. Currently Implemented Features

The project is built and fully functional with the following features:

### Upstash Redis Infrastructure

- **Singleton `ioredis` Client**: Centralized, reusable Redis client ([app/lib/redis.ts](file:///b:/file-store/File-Storage-System/app/lib/redis.ts)) connecting to Upstash Redis Cloud over TLS (`REDIS_URL="rediss://..."`). Validates environment configuration, handles connection logging via `Logger.withContext("Redis")`, and preserves hot-reload singletons in development (`globalForRedis`).
- **Better Auth Redis Session Management**: Configured `secondaryStorage` in Better Auth ([app/lib/auth.ts](file:///b:/file-store/File-Storage-System/app/lib/auth.ts)) mapping `get`, `set`, and `delete` directly to the `ioredis` singleton. Authenticated requests check Redis first, bypassing PostgreSQL queries while preserving database backups (`storeSessionInDatabase: true`).
- **Redis-Backed Auth Rate Limiting**: Active pre-request rate limiting on authentication routes (`/api/auth/sign-in/email` and `/api/auth/sign-up/email`) using a Sliding Window Counter algorithm ([app/lib/rate-limiter.ts](file:///b:/file-store/File-Storage-System/app/lib/rate-limiter.ts) & [app/lib/auth-rate-limiter.ts](file:///b:/file-store/File-Storage-System/app/lib/auth-rate-limiter.ts)). Enforces `429 Too Many Requests` responses with `Retry-After` headers after exceeding max attempts (default: 5 attempts per 15 minutes).

### Authentication & Authorization

- **Better Auth Integration**: Utilizes `better-auth` (v1.6.23) with Redis secondary storage for session management and authorization.
- **Authentication Methods**: Supports both standard Email/Password credentials and Google OAuth.
- **Email Verification**: Requires email verification for credential sign-ups, sending secure verification links via Brevo transactional email ([app/lib/email-service.ts](file:///b:/file-store/File-Storage-System/app/lib/email-service.ts)). A dedicated `/api/auth/resend-verification` endpoint allows resending the verification email.
- **Database Hooks**: Automatically updates user roles to `admin` upon registration or session creation if their ID is specified in the `ADMIN_USER_IDS` environment variable.
- **Shared Permissions Model**: Restricts access to files. Files can be private, shared via tokenized links, shared directly with other registered users via their email addresses, or shared with groups.
- **Group Sharing & Collaboration**: Enables users to create groups, manage group memberships with specific roles (Owner, Admin, Member), and share files with one or more groups simultaneously under distinct preview and download capabilities.

### Email Invitations (`/api/invitations`)

- **Pending Invites for Unknown Emails**: When a user shares a file or invites a member to a group using an email that isn't registered yet, an `Invitation` is created (`PENDING`) instead of failing ([app/lib/invitation-service.ts](file:///b:/file-store/File-Storage-System/app/lib/invitation-service.ts)).
- **Invite Emails**: A branded invitation email (with logo) is delivered via Brevo, containing a sign-up link with the email pre-filled (`/sign-up?email=...`).
- **Auto-Grant on Signup**: After a new user registers, any `PENDING`, non-expired invites for their email are automatically applied — file access becomes a `FilePermission` row, group invites become `GroupMember` rows — and logged as `invite_granted`.
- **Invite Management UI**: Pending invites for files are shown and manageable inside `ShareModal` / `FileAccessManager`; pending group invites are shown and manageable in the group detail page (resend / cancel).
- **Lifecycle**: Invites expire after `INVITE_EXPIRATION_DAYS` (default 7). The cleanup cron marks stale invites as `EXPIRED`.

### Main File Dashboard (`/dashboard`)

- **Tabbed Dashboard**: Separate tabs for **My Files** (owned files) and **Shared with Me** (files other users have shared).
- **Folder Organization**:
  - Create, rename, move, and delete folders with nested (recursive) support using PostgreSQL recursive CTEs ([app/lib/folder-service.ts](file:///b:/file-store/File-Storage-System/app/lib/folder-service.ts)).
  - Breadcrumb navigation and inline folder creation UI; deleting a folder cascades to all descendant folders and files (releasing R2 objects and quota).
  - Folder-aware file operations via `MoveToDialog` (single or bulk move to any folder).
- **Server-Side Pagination**: Cursor-based pagination for file lists (`DEFAULT_PAGE_SIZE` 50, `MAX_PAGE_SIZE` 100) using an encoded `createdAt|id` cursor ([app/lib/pagination.ts](file:///b:/file-store/File-Storage-System/app/lib/pagination.ts)).
- **Selection & Bulk Operations**:
  - Selection mode with Set-based select-all model and shift-range row selection.
  - **Bulk Move** (`POST /api/files/bulk-move`): moves files and/or folders to a target folder, supporting `selectAll` scoped to the current folder with `excludeIds`, returning per-item `moved/forbidden/notFound/failed/skipped` outcomes.
  - **Bulk Delete** (`POST /api/files/bulk-delete`): permanently deletes files and entire folder trees (releasing R2 objects + quota) or, in the Shared tab, removes shared access.
- **Direct Multipart Upload UI**:
  - Allows selecting files up to 200 MB.
  - Uploads file chunks concurrently (limit: 3) directly to Cloudflare R2.
  - Shows real-time progress, upload speed (MB/s), and ETA (seconds).
  - Supports canceling/aborting an active upload (cleans up unfinished R2 parts).
  - Automatically retries failed chunk uploads (up to 3 times per chunk).
- **Download**: Downloads files by requesting a short-lived presigned GET URL.
- **Native Browser Preview**: Opens a modal in-page using standard browser capabilities for supported types (images, videos, PDFs) via an `inline` presigned GET URL, with a canvas-based PDF viewer supporting zoom & rotation ([PDFCanvasViewer.tsx](file:///b:/file-store/File-Storage-System/app/components/shared/PDFCanvasViewer.tsx)).
- **File Sharing (ShareModal / FileAccessManager)**:
  - **Secure Share Links**: Generates unique share tokens with custom parameters (Allow Preview, Allow Download, and optional Expiration Dates).
  - **User Permissions**: Allows assigning direct access to other users via email address; unknown emails produce a pending invitation instead.
- **File Deletion**: Permanently deletes a file from object storage and deletes its database metadata, releasing the user's quota.

### Shared Files Management (`/shared`)

- **Shared Files List** (`GET /api/shared`): Paginated list of the user's own files that are shared in any way (share links, user permissions, group sharing, or pending invites), showing per-file sharing counts (links, users, groups, invites) ([app/api/shared/route.ts](file:///b:/file-store/File-Storage-System/app/api/shared/route.ts)).
- **Per-File Access Management** (`/shared/[fileId]`): A dedicated page to manage all sharing facets of one file — links, user permissions, group shares, and pending invites — powered by the extracted `FileAccessManager` component.
- **File Metadata Endpoint** (`GET /api/files/[id]`): Returns full file metadata (plus share/permission/group/invite summaries) for the access management page.
- **Shared Files Nav Tab**: A dedicated "Shared Files" navigation tab in the AppShell, with routes protected in `proxy.ts`.

### Guest / Public Share Page (`/s/[token]`)

- **Public and Authenticated Access**: Resolves file preview and download for users using a tokenized sharing link.
- **Granular Security Enforcement**: Respects link status (`isActive`), link expirations (`expiresAt`), and permission restrictions (`allowPreview`, `allowDownload`).

### Quota & Usage Tracking

- **Transactional Safety**: Uses transactional row-level locking (`FOR UPDATE` raw SQL queries) to prevent race conditions during concurrent uploads.
- **Allocated Quota**: Default quota is **200 MB** per user (configurable by admin).
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
  - `file_deleted`, `shared_file_removed`
  - `folder_created`, `folder_renamed`, `folder_deleted`, `folder_moved`, `file_moved`
  - `invite_sent`, `invite_cancelled`, `invite_expired`, `invite_granted`

### Cleanup Job (`/api/cron/cleanup`)

- **Orphan Cleanup**: Cron-triggered endpoint that scans and cleans up expired upload sessions, aborts incomplete multipart uploads on R2, and marks corresponding files as failed in the DB.
- **Invite Expiration**: Also marks stale `PENDING` invitations (`expiresAt < now`) as `EXPIRED`.

### Product Tours & Onboarding

- **Interactive Tours**: driver.js-based product tours for the Dashboard and Groups pages, launched from a kickoff modal and persisted via localStorage ([app/lib/tour.ts](file:///b:/file-store/File-Storage-System/app/lib/tour.ts), `TourKickoffModal`).

### Landing Page (`/`)

- **Marketing Page**: Modular landing page with navigation, hero, features, "how it works", product preview, and final CTA sections featuring scroll-reveal animations ([app/components/landing/](file:///b:/file-store/File-Storage-System/app/components/landing/)).

### UI/UX Enhancements

- **Loading States / Skeletons**: `react-loading-skeleton`-based skeleton loaders for dashboard file list, groups grid & detail, admin stats/users tables, profile, share modal, file preview modal, and move-to-folder dialog, plus `use-async-action` loading states on async buttons.
- **Polish**: sonner toasts, `ConfirmationDialog`, `EmptyState`, inline preview buttons, icon-only action buttons, active-navbar tab tint, and mobile-responsive navigation.
- **Vercel Web Analytics**: Integrated for production traffic measurement.

---

## 3. Technology Stack

### Core Frameworks

- **Runtime**: Bun (v1.x)
- **Framework**: Next.js (v16.2.10) using App Router (Next 16 `proxy.ts` request handler convention) & React (v19.2.4)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (v4) using `@tailwindcss/postcss`
- **Database client**: Prisma ORM (v7.8.0)
- **Database**: PostgreSQL (Supabase)

### Authentication & Caching / Rate Limiting

- **Auth Engine**: Better Auth (v1.6.23) with `admin` plugin & `secondaryStorage` Redis integration
- **Redis Driver**: `ioredis` (v5.11.1)
- **Redis Cloud Provider**: Upstash Redis

### Object Storage Client

- **SDK**: AWS SDK S3 client (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) connected to Cloudflare R2

### Email & Notifications

- **Transactional Email**: Brevo (`@getbrevo/brevo` + REST SMTP API) for email verification and invitations
- **Toasts**: `sonner`

### UI & Interaction Libraries

- **Icons**: `lucide-react`
- **Skeletons**: `react-loading-skeleton`
- **Product Tours**: `driver.js`
- **PDF Preview**: `pdfjs-dist` (canvas-based viewer with zoom/rotation)
- **Analytics**: `@vercel/analytics`

---

## 4. Directory Structure

```txt
file-storage-system/
├── .agent/                   # Custom agent configurations (rules, skills, workflows)
├── .opencode/                # Project skills & agent config
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
│   │   │   ├── [...all]/     # Better Auth catch-all route
│   │   │   │   └── route.ts
│   │   │   └── resend-verification/ # Resends verification emails
│   │   │       └── route.ts
│   │   ├── cron/             # Scheduled cleanup endpoints
│   │   │   └── cleanup/      # Expires upload sessions & stale invites
│   │   │       └── route.ts
│   │   ├── files/            # File management, upload lifecycle, permissions, and share links
│   │   │   ├── route.ts      # Lists owned/shared files (cursor paginated)
│   │   │   ├── [id]/         # Operations specific to a file
│   │   │   │   ├── route.ts  # GET file metadata (with share/group/invite summaries)
│   │   │   │   ├── download-url/  # Requests presigned read URLs (preview/download)
│   │   │   │   │   └── route.ts
│   │   │   │   ├── groups/        # Manages group sharing configuration for a file
│   │   │   │   │   ├── [groupId]/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   ├── move/          # Moves a file into a folder
│   │   │   │   │   └── route.ts
│   │   │   │   ├── permissions/   # Assigns or revokes specific user permissions
│   │   │   │   │   ├── [userId]/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── share/         # Manages tokenized sharing links
│   │   │   │       ├── [linkId]/
│   │   │   │       │   └── route.ts
│   │   │   │       └── route.ts
│   │   │   ├── abort-upload/  # Cancels/aborts an active multipart upload
│   │   │   │   └── route.ts
│   │   │   ├── bulk-delete/   # Bulk deletes files/folder trees or removes shared access
│   │   │   │   └── route.ts
│   │   │   ├── bulk-move/     # Bulk moves files and folders to a target folder
│   │   │   │   └── route.ts
│   │   │   ├── complete-upload/ # Finalizes multipart upload in R2 and updates DB
│   │   │   │   └── route.ts
│   │   │   ├── initiate-upload/ # Quota check and multipart initialization
│   │   │   │   └── route.ts
│   │   │   └── sign-part/     # Requests presigned URL for a single upload part
│   │   │       └── route.ts
│   │   ├── folders/           # Folder CRUD and navigation
│   │   │   ├── route.ts       # Create folder / list root folders
│   │   │   ├── contents/      # Folder contents (subfolders + paginated files)
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts   # Rename / delete folder
│   │   │       ├── breadcrumb/ # Breadcrumb path for a folder
│   │   │       │   └── route.ts
│   │   │       └── move/      # Move folder (with cycle protection)
│   │   │           └── route.ts
│   │   ├── groups/           # Group management and member endpoints
│   │   │   ├── route.ts
│   │   │   └── [groupId]/
│   │   │       ├── route.ts
│   │   │       └── members/
│   │   │           ├── route.ts
│   │   │           └── [memberUserId]/
│   │   │               └── route.ts
│   │   ├── invitations/      # Pending email invitations
│   │   │   └── [inviteId]/
│   │   │       ├── route.ts  # Cancel / list pending invites
│   │   │       └── resend/   # Resend invitation email
│   │   │           └── route.ts
│   │   ├── profile/          # User quota utilization stats API
│   │   │   └── route.ts
│   │   ├── s/                # Public/authenticated access via share links
│   │   │   └── [token]/      # Resolves files using active share link tokens
│   │   │       └── route.ts
│   │   └── shared/           # Shared files list with sharing counts
│   │       └── route.ts
│   ├── components/           # Reusable UI components
│   │   ├── admin/            # Admin panel components (stats grid, users table, quota editor, skeletons)
│   │   ├── dashboard/        # Dashboard sub-components
│   │   │   ├── BreadcrumbNav.tsx  # Folder breadcrumb navigation
│   │   │   ├── FileIcon.tsx       # Helper to display mime-type specific icons
│   │   │   ├── FileListItem.tsx   # Renders a file list row (preview/download/share/delete/move)
│   │   │   ├── FolderListItem.tsx # Renders a folder row with actions
│   │   │   ├── MoveToDialog.tsx   # Folder-picker dialog for single/bulk move
│   │   │   ├── NewFolderInput.tsx # Inline folder creation
│   │   │   ├── RenameFolderDialog.tsx
│   │   │   ├── SelectionToolbar.tsx # Bulk-action toolbar (select all / move / delete)
│   │   │   ├── UploadPanel.tsx     # Multipart upload UI with progress, speed, and cancel
│   │   │   └── types.ts
│   │   ├── groups/           # Group components (create modal, member/files lists, invites, skeletons)
│   │   ├── landing/          # Landing page sections (Hero, Features, HowItWorks, ProductPreview, CTA, Footer)
│   │   └── shared/           # Shared layout and UI helpers
│   │       ├── AppShell.tsx   # Top/side navigation bar layout (Klein Blue theme, Shared tab)
│   │       ├── ConfirmationDialog.tsx # Confirmation prompt wrapper
│   │       ├── EmptyState.tsx # Empty list placeholder
│   │       ├── FileAccessManager.tsx # Per-file access management (links, users, groups, invites)
│   │       ├── FilePreviewModal.tsx  # In-browser preview modal
│   │       ├── ModalShell.tsx # Accessible modal shell
│   │       ├── PDFCanvasViewer.tsx  # Canvas-based PDF viewer with zoom & rotation
│   │       ├── Skeleton.tsx   # Shared react-loading-skeleton wrapper
│   │       ├── ShareModal.tsx # Sharing popup for links, users, and pending invites
│   │       ├── TourKickoffModal.tsx # Product tour launcher
│   │       ├── use-async-action.ts # Loading state helper for async buttons
│   │       └── ...            # Logo, SectionCard, StatCard, StatusBadge, StorageBar, UserAvatar, etc.
│   ├── dashboard/            # Main User Dashboard page (tabs, folders, pagination, selection)
│   │   └── page.tsx
│   ├── generated/            # Output directory for Prisma Client
│   ├── globals.css           # Global CSS styles including tour (driver.js) theme
│   ├── group/                # User Group detail page
│   │   └── [id]/
│   │       └── page.tsx
│   ├── groups/               # User Groups management page
│   │   └── page.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuthRedirect.ts
│   │   ├── useConfirmDialog.ts
│   │   ├── useFilePreview.ts
│   │   ├── useProductTour.ts
│   │   └── useUploadManager.ts
│   ├── layout.tsx            # Main layout wrapper (Vercel Analytics)
│   ├── lib/                  # Backend services & shared libraries
│   │   ├── admin-service.ts        # Admin stats & user management
│   │   ├── audit-service.ts        # Audit log writer
│   │   ├── auth.ts / auth-client.ts # Better Auth server & client config
│   │   ├── authorization-service.ts # canAccessFile + access checks
│   │   ├── config.ts               # Dynamic APP_URL / env resolution
│   │   ├── email-service.ts        # Brevo transactional email (verification + invites)
│   │   ├── email-templates/        # HTML/text templates (verification-email, invite-email)
│   │   ├── file-service.ts         # File CRUD, quota, bulk delete/remove-shared
│   │   ├── folder-service.ts       # Folder CRUD, recursive CTEs, bulk move
│   │   ├── group-service.ts        # Groups, members, permissions
│   │   ├── invitation-service.ts   # Pending invites, auto-grant, resend/cancel/expire
│   │   ├── logger.ts               # Centralized context logger + withLogging
│   │   ├── pagination.ts           # Cursor-based pagination helpers
│   │   ├── prisma.ts               # Prisma client singleton
│   │   ├── r2.ts                   # Cloudflare R2 / S3 service
│   │   ├── rate-limiter.ts         # Sliding Window Counter algorithm
│   │   ├── auth-rate-limiter.ts    # Auth-route rate limiter
│   │   ├── redis.ts                # ioredis singleton
│   │   ├── request-user.ts         # getRequestUser from proxy headers
│   │   ├── share-service.ts        # Share links & file permissions
│   │   ├── tokens.ts               # Design tokens (Klein Blue theme)
│   │   ├── tour.ts                 # driver.js tour definitions
│   │   └── upload-manager.ts       # Client-side multipart upload engine
│   ├── page.tsx              # Public-facing landing page
│   ├── profile/              # User profile page (storage usage + audit metrics)
│   │   └── page.tsx
│   ├── s/                    # Guest/authenticated share link routing
│   │   └── [token]/          # Share link viewer and downloader interface
│   │       └── page.tsx
│   ├── shared/               # Shared Files management
│   │   ├── page.tsx          # List of shared files with sharing counts
│   │   └── [fileId]/         # Per-file access management page
│   │       └── page.tsx
│   ├── sign-in/              # Credentials and Google social sign-in page
│   │   └── page.tsx
│   └── sign-up/              # Credentials registration page (email pre-fill from invite)
│       └── page.tsx
├── prisma/                   # Prisma Schema & Database Configuration
│   ├── schema.prisma         # Database schema (see Section 5)
│   ├── seed.ts               # Admin user seeding script
│   └── configure-r2.ts       # R2 bucket + CORS configuration script
├── proxy.ts                  # Next 16 Request Interceptor (middleware)
├── package.json              # Project dependencies and script runner configurations
├── bun.lock                  # Bun lockfile
├── eslint.config.mjs         # ESLint 9 configuration ignoring build/agent artifacts
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
    folder {
        string id PK
        string name
        string ownerUserId FK
        string parentFolderId FK
        datetime createdAt
        datetime updatedAt
    }
    file {
        string id PK
        string ownerUserId
        string groupId
        string folderId FK
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
        string folderId
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
    invitation {
        string id PK
        string email
        string resourceType
        string fileId FK
        string groupId FK
        string permission
        string token UK
        string status
        string invitedByUserId FK
        datetime expiresAt
        datetime acceptedAt
        datetime createdAt
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
    user ||--o{ folder : "owns"
    user ||--o{ invitation : "invites"
    folder ||--o{ folder : "parent"
    folder ||--o{ file : "contains"
    file ||--o{ upload_session : "spawns"
    file ||--o{ share_link : "has"
    file ||--o{ file_permission : "has"
    file ||--o{ group_file : "shared_in"
    file ||--o{ invitation : "targeted_by"
    group ||--o{ group_member : "has"
    group ||--o{ group_file : "has"
    group ||--o{ invitation : "targeted_by"
```

### Models Summary

- **User**: Better Auth schema extended with `role`, `banned`, `banReason`, and `banExpires`. Role is `admin` or default.
- **Session & Account & Verification**: Standard Better Auth entities mapping active user logins and social providers.
- **Folder**: Represents a user-owned folder with an optional self-referencing `parentFolderId` (nested hierarchy via recursive CTEs). Enforces unique names per owner per parent location.
- **File**: Stores object storage details, mime-type, original filename, status (`uploading`, `available`, `failed`, `deleted`), group settings, and an optional `folderId` for organization.
- **UploadSession**: Represents an active multipart upload session. Maps a `storageUploadId` issued by Cloudflare R2 and tracks status (`initiated`, `uploading`, `completed`, `aborted`, `expired`, `failed`).
- **QuotaUsage**: Maintains storage usage per user. Defaults to 200 MB (`209715200` bytes).
- **AuditLog**: Stores structural activity logs tracking uploads, downloads, deletions, folder operations, file moves, and invitations.
- **ShareLink**: Stores tokenized sharing configurations enabling public preview and download access based on expiration or flag rules.
- **FilePermission**: Grants granular user-to-user access (`read` or `write` permission override) for a specific file.
- **Group**: Represents a collection of users with a group owner and options for archiving.
- **GroupMember**: Junction model representing group memberships, containing user roles (`OWNER`, `ADMIN`, `MEMBER`).
- **GroupFile**: Junction model mapping which files are shared with which groups, along with granular access settings (`allowPreview`, `allowDownload`, `isActive`).
- **Invitation**: Represents a pending email invitation to share a `FILE` (with `read`/`write` permission) or a `GROUP` (with `ADMIN`/`MEMBER` role) with an email address that isn't registered yet. Statuses: `PENDING`, `ACCEPTED`, `CANCELLED`, `EXPIRED`. Auto-granted to the user upon signup.

### Redis Key Schemas

| Key Pattern                                           | Type             | Description                                                             | TTL                                  |
| :---------------------------------------------------- | :--------------- | :---------------------------------------------------------------------- | :----------------------------------- |
| `<session-token>`                                     | String (JSON)    | Stores `{ session, user }` payload for fast Better Auth session lookups | Session expiration (default: 7 days) |
| `active-sessions-<userId>`                            | String (JSON)    | Array of active session tokens `[{ token, expiresAt }]` per user        | Max active session TTL               |
| `ratelimit:auth_ratelimit:<ip>:<email>:<windowIndex>` | String (Integer) | Sliding window failure count counter for authentication rate limiting   | `2 * windowSeconds` (default: 1800s) |

---

## 6. Architectural Principles & Critical Workflows

### 6.1 The Large Upload Rule (Direct Upload Flow)

Large files (up to 200 MB) must never stream through the Next.js server. The backend serves only as an authenticator and orchestrator.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Browser
    participant API as Next.js Server
    participant DB as Postgres (Prisma)
    participant Storage as Cloudflare R2

    Client->>API: POST /api/files/initiate-upload (name, size, type, folderId?)
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

### 6.3 Bulk Move & Delete Workflow

Bulk operations support both explicitly selected items and a "select all" scope resolved server-side.

1. **Selection**: The dashboard selection toolbar collects selected file/folder IDs (optionally `selectAll` + `excludeIds` scoped to the current folder).
2. **Bulk Move** (`POST /api/files/bulk-move`): Resolves the "select all" scope, validates ownership and target-folder permissions, prevents moving a folder into itself/descendants (via recursive CTE), rejects name collisions, then applies moves inside one transaction with extended `maxWait`/`timeout`.
3. **Bulk Delete** (`POST /api/files/bulk-delete`): For owned files, deletes R2 objects, releases quota under a `FOR UPDATE` lock, and deletes folder trees recursively. In the "Shared with Me" context, it removes the user's direct `FilePermission` rows instead.
4. **Audit**: Each successful operation writes `file_moved` / `folder_moved` / `file_deleted` / `shared_file_removed` audit entries.

### 6.4 Invitation Lifecycle

1. **Create**: Sharing a file or inviting a group member by an unregistered email creates a `PENDING` `Invitation` and sends a branded Brevo email with a pre-filled sign-up link.
2. **Signup**: On registration, `grantPendingInvitesForUser` grants all valid pending invites (file → `FilePermission`, group → `GroupMember`) and marks them `ACCEPTED`.
3. **Manage**: Inviters (or admins) can resend (refreshes `expiresAt`) or cancel (`CANCELLED`) pending invites from the file/group UIs.
4. **Expire**: The cleanup cron flips stale `PENDING` invites to `EXPIRED`.

### 6.5 Centralized Logging Request Lifecycle

All major endpoints are wrapped with `withLogging` from [logger.ts](file:///b:/file-store/File-Storage-System/app/lib/logger.ts). When a request is received, it:

1. Generates/inherits a logger context.
2. Logs `REQUEST: [method] [url]`.
3. Monitors execution time.
4. Logs `RESPONSE: [method] [url] - Status [status] - [duration]ms` upon completion, or reports errors using the error-level logger.

### 6.6 Cleanup Cron Job

1. **Trigger**: `/api/cron/cleanup` is hit (protected by an optional `CRON_SECRET` search parameter).
2. **Retrieve**: Queries all `UploadSession` records with status `initiated` or `uploading` that have passed their `expiresAt` timestamp.
3. **Cleanup**: For each expired session:
   - Calls R2 `AbortMultipartUploadCommand` to delete accumulated chunk data.
   - Updates `UploadSession` status to `expired`.
   - Updates `File` status to `failed` and sets `deletedAt`.
   - Logs `upload_expired` to the `AuditLog` table.
4. **Invites**: Marks all `PENDING` invitations whose `expiresAt` has passed as `EXPIRED`.

---

## 7. Environment & Configuration

The application expects the following configuration in `.env` (refer to `.env.example`):

| Variable Name                    | Description                                               | Example Value                                                     |
| :------------------------------- | :-------------------------------------------------------- | :---------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`             | Secure secret key for Better Auth session signing         | _High-entropy hash_                                               |
| `BETTER_AUTH_URL`                | Base URL of the running Next.js app                       | `http://localhost:3000`                                           |
| `GOOGLE_CLIENT_ID`               | Google Client ID for OAuth login                          | `76472721...apps.googleusercontent.com`                           |
| `GOOGLE_CLIENT_SECRET`           | Google Client Secret for OAuth login                      | `GOCSPX-...`                                                      |
| `DATABASE_URL`                   | PostgreSQL pooled connection string (Supabase / local)    | `postgresql://user:pass@localhost:5432/db`                        |
| `DIRECT_URL`                     | PostgreSQL direct connection string for Prisma migrations | `postgresql://postgres:[PASS]@db.[REF].supabase.co:5432/postgres` |
| `REDIS_URL`                      | Upstash Redis connection string (TLS enabled)             | `rediss://default:TOKEN@HOST:6379`                                |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS`   | Max allowed failed login attempts before blocking         | `5`                                                               |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | Rate limiting sliding window duration in seconds          | `900` (15 minutes)                                                |
| `ENVIRONMENT`                    | Active environment flag (`dev` / `prod`)                  | `dev`                                                             |
| `DEV_URL`                        | Base URL used when `ENVIRONMENT=dev`                      | `http://localhost:3000`                                           |
| `PROD_URL`                       | Base URL used when `ENVIRONMENT=prod`                     | `https://your-production-url.vercel.app`                          |
| `BREVO_API_KEY`                  | Brevo transactional email API key                         | `xkeysib-...`                                                     |
| `EMAIL_FROM`                     | Sender name/email for outbound emails                     | `"Vault FileStorage <hello@brevo.com>"`                           |
| `INVITE_EXPIRATION_DAYS`         | Days before pending invitations expire                    | `7`                                                               |
| `ACCESS_KEY`                     | Cloudflare R2 Access Key ID                               | `9a84a3c71f45345...`                                              |
| `SECRET_ACCESS_KEY`              | Cloudflare R2 Secret Access Key                           | `42ebd7191d5...`                                                  |
| `S3_URL`                         | Cloudflare R2 endpoint URL                                | `https://<account-id>.r2.cloudflarestorage.com`                   |
| `R2_BUCKET`                      | The name of the Cloudflare R2 bucket                      | `file-storage-system`                                             |
| `ADMIN_USER_IDS`                 | Comma-separated user IDs seeded as admin on login         | `user-uuid-1,user-uuid-2`                                         |
| `CRON_SECRET`                    | Secret token to authenticate the cleanup cron endpoint    | `my_cron_secret`                                                  |

> **Note**: `BETTER_AUTH_URL` is automatically overridden from `APP_URL` (resolved from `ENVIRONMENT` + `DEV_URL`/`PROD_URL`) at runtime by [config.ts](file:///b:/file-store/File-Storage-System/app/lib/config.ts).

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
- **Recursive Folder Queries**: Folder descendants and breadcrumbs must use PostgreSQL recursive CTEs (`WITH RECURSIVE`) to stay efficient and correct for deep nesting.
- **Separation of Concerns**: Keep API routes thin. Centralize database logic and external S3 interactions within `app/lib/` service modules (`fileService`, `folderService`, `r2Service`, `adminService`, `auditService`, `shareService`, `groupService`, `invitationService`, `authorizationService`, `emailService`).
- **Prisma Generated Output**: Prisma Client output is configured to write to the `app/generated/prisma` directory (see [schema.prisma](file:///b:/file-store/File-Storage-System/prisma/schema.prisma)). Remember to reference imports correctly.
- **Sleek Aesthetic & Design System**: Utilize color variables from [tokens.ts](file:///b:/file-store/File-Storage-System/app/lib/tokens.ts) ("Klein Blue" theme) to keep user interfaces consistent, using custom components (e.g. `AppShell`, `SectionCard`, `StatusBadge`, `Skeleton`).

### Common CLI Tasks

- **Install dependencies**: `bun install`
- **Run local server**: `bun run dev`
- **Push schema / generate client**: `bun prisma db push` / `bun prisma generate`
- **Seed admin users**: `bun run db:seed`
- **Deploy DB migrations**: `bun prisma migrate dev`
- **Expose CORS / Configure R2**: `bun run prisma/configure-r2.ts`
- **Type-check codebase**: `bun run typecheck`
- **Lint codebase**: `bun run lint`
- **Format codebase**: `bun run format`