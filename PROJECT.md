# File Storage System Project

## Purpose

Build a production-oriented file storage system for real users. The system should allow authenticated users to upload, download, preview, organize, and share documents and media files. It should support individual user storage as well as group-based file sharing.

This document is intended to be maintained by Claude or another LLM agent. Treat it as the project source of truth unless the user provides newer instructions.

## Confirmed Requirements

### Core Features

- Users can upload documents and media files.
- Users can download files they are allowed to access.
- Target large file support: approximately 1 GB per file.
- Supported media/file types include images, videos, PDFs, and other common document types.
- Files can be shared using shareable links.
- Shareable links must support visibility/access control.
- Authenticated users have a dashboard showing files they uploaded.
- Users can open and preview files from the dashboard.
- Preview support should be basic browser-native preview:
  - Images through standard image rendering.
  - Videos through browser video player.
  - PDFs through browser PDF rendering.
  - Unsupported files can fall back to download.
- Authentication is required.
- Rate limiting is required.
- Storage quota tracking is required.
- Default example quota: 5 GB per user.
- Users can create groups.
- Groups can contain multiple users.
- Users in a group can upload and download documents from that group, subject to permissions.

### Scale Assumptions

- Initial production scale: 10 to 15 users.
- The system should still be designed with production correctness in mind.
- Do not optimize prematurely for massive scale.
- Avoid architectures that make large uploads pass through the application server.

## Chosen Tech Stack

### Application

- Primary framework: Next.js.
- Language: TypeScript.
- Frontend: Next.js App Router.
- Backend: Next.js route handlers/server-side modules.
- Do not use Go.
- Do not use Java.

### Authentication

- Use Better Auth.
- Keep auth integration TypeScript-native.
- Authorization logic must be implemented explicitly around users, groups, files, and share links.

### Database

- Use PostgreSQL for:
  - User information.
  - File metadata.
  - Group metadata.
  - Group memberships.
  - Share links.
  - Upload sessions.
  - Quota tracking.
  - Audit logs.

### ORM / Query Layer

- Preferred: Drizzle ORM.
- Acceptable alternative: Prisma.
- Prefer explicit transaction control for quota and upload-session logic.

### Object Storage

- Use S3-compatible object storage.
- Preferred first option: Cloudflare R2.
- Alternative: AWS S3.
- Files must be stored in object storage, not in PostgreSQL and not on the app server filesystem.

### Rate Limiting / Cache

- Use Redis-compatible storage.
- Practical hosted options:
  - Upstash Redis.
  - Redis Cloud.
  - Self-hosted Redis if deploying on a VPS.

### Validation

- Use Zod for request validation and shared TypeScript schemas where useful.

### Deployment Direction

Recommended initial production deployment:

- Next.js on Vercel or similar.
- PostgreSQL on Neon, Supabase, RDS, or another managed Postgres provider.
- Object storage on Cloudflare R2 or AWS S3.
- Redis on Upstash Redis, Redis Cloud, or equivalent.

## Architecture Principles

### Large Upload Rule

Large file bytes must not pass through the Next.js backend.

Correct flow:

1. Browser asks Next.js backend to initiate an upload.
2. Backend authenticates the user.
3. Backend checks rate limits, permissions, and quota.
4. Backend creates an upload session and object-storage multipart upload.
5. Backend returns signed upload URLs.
6. Browser uploads file parts directly to R2/S3.
7. Browser reports uploaded parts back to backend.
8. Backend completes the multipart upload.
9. Backend marks the file metadata as available.

### Download / Preview Rule

Do not expose permanent public object-storage URLs.

Correct flow:

1. Browser requests file access from the app.
2. Backend authenticates the user or validates share-link access.
3. Backend checks file permissions.
4. Backend returns a short-lived signed read URL.
5. Browser uses the signed URL for preview or download.

### Quota Rule

Quota checks must be transactionally safe.

Example:

- User quota: 5 GB.
- User current usage: 4.6 GB.
- New file size: 700 MB.
- Upload must be rejected because it would exceed quota.

Concurrent upload race conditions must be handled. Do not only sum file sizes at request time without locking or reserved-byte tracking.

Preferred approach:

- Track committed usage.
- Track reserved upload bytes for in-progress uploads.
- Use database transactions and row-level locking where needed.
- Release reserved bytes when uploads fail, expire, or are aborted.

## Back-of-the-Envelope Numbers

### Per User Storage

- Default quota: 5 GB per user.
- Initial users: 10 to 15.
- Total possible user quota allocation:
  - 10 users * 5 GB = 50 GB.
  - 15 users * 5 GB = 75 GB.

### Large File Uploads

- Target large file size: approximately 1 GB.
- A 5 GB quota allows about 5 files of 1 GB each per user, before metadata and smaller files are considered.
- Across 10 users, worst-case quota-filled usage is about 50 one-GB files.
- Across 15 users, worst-case quota-filled usage is about 75 one-GB files.

### Multipart Upload Sizing

Use multipart upload for large files.

Reasonable initial part size:

- 16 MB per part.

Approximate part counts:

- 1 GB file / 16 MB = about 64 parts.
- 5 GB quota filled with 1 GB files = about 320 uploaded parts per user over time.

Alternative part size:

- 32 MB per part.

Approximate part counts:

- 1 GB file / 32 MB = about 32 parts.

Initial recommendation:

- Start with 16 MB or 32 MB parts.
- Keep concurrency modest, such as 3 to 5 simultaneous part uploads per file.
- Prefer correctness and stable retry behavior over maximum throughput.

### Metadata Size

Metadata in PostgreSQL should be small relative to object storage.

Expected metadata per file is likely a few KB or less, including:

- File row.
- Permission rows.
- Share-link rows.
- Audit rows.
- Upload-session rows.

For 50 to 75 large files, metadata storage is negligible compared with object storage usage.

## Suggested Source Layout

Use clear server modules instead of putting all logic directly inside route handlers.

```txt
src/
  app/
    api/
      files/
      groups/
      share-links/
      auth/
  server/
    auth/
    db/
    files/
    groups/
    permissions/
    quota/
    rate-limit/
    share-links/
    storage/
    upload-sessions/
    audit/
  components/
  lib/
```

Route handlers should be thin. Business logic should live under `src/server`.

## Suggested API Surface

Initial file APIs:

```txt
POST /api/files/initiate-upload
POST /api/files/sign-part
POST /api/files/complete-upload
POST /api/files/abort-upload
GET  /api/files
GET  /api/files/:id
GET  /api/files/:id/view-url
GET  /api/files/:id/download-url
DELETE /api/files/:id
```

Initial share-link APIs:

```txt
POST /api/share-links
GET  /api/share/:token
PATCH /api/share-links/:id
DELETE /api/share-links/:id
```

Initial group APIs:

```txt
POST /api/groups
GET  /api/groups
GET  /api/groups/:id
POST /api/groups/:id/members
PATCH /api/groups/:id/members/:userId
DELETE /api/groups/:id/members/:userId
GET  /api/groups/:id/files
```

## Suggested Database Tables

Minimum core tables:

```txt
users
sessions
accounts
files
upload_sessions
groups
group_members
file_permissions
share_links
quota_usage
audit_logs
```

Important `files` fields:

```txt
id
owner_user_id
group_id nullable
bucket
object_key
original_name
mime_type
size_bytes
status: uploading | available | failed | deleted
visibility: private | group | link
created_at
updated_at
deleted_at nullable
```

Important `upload_sessions` fields:

```txt
id
file_id
user_id
storage_upload_id
object_key
size_bytes
reserved_bytes
part_size_bytes
status: initiated | uploading | completed | aborted | expired | failed
created_at
expires_at
completed_at nullable
```

Important `share_links` fields:

```txt
id
file_id
token_hash
created_by_user_id
visibility
expires_at nullable
max_downloads nullable
download_count
created_at
revoked_at nullable
```

Important `quota_usage` fields:

```txt
user_id
quota_bytes
used_bytes
reserved_bytes
updated_at
```

## Permission Model

Start simple.

Suggested group roles:

```txt
owner
admin
member
viewer
```

Suggested file access rules:

- File owner can view, download, share, and delete their files.
- Group owner/admin can manage files in the group.
- Group member can upload and download group files if allowed by group policy.
- Group viewer can only view/download group files.
- Share-link access is controlled by token validity, expiry, revocation, and optional download limits.

Keep permission checks centralized in `src/server/permissions`.

## Background Jobs

The project needs background cleanup even at small scale.

Initial jobs:

- Expire old upload sessions.
- Abort incomplete multipart uploads.
- Release reserved quota for failed or expired uploads.
- Delete object-storage files for soft-deleted records after a retention window.
- Expire or revoke old share links.

For the first version, jobs can be implemented as protected cron endpoints or deployment-provider scheduled functions.

## Security Requirements

- All file access must go through application-level authorization.
- Object storage buckets should be private.
- Signed upload URLs should be short-lived.
- Signed download/view URLs should be short-lived.
- Share-link tokens must be high entropy.
- Store only token hashes for share links, not raw tokens.
- Validate MIME type and file size before initiating upload.
- Treat client-provided MIME type as advisory, not fully trusted.
- Add rate limits to auth, upload initiation, signed URL generation, share-link access, and download URL generation.
- Record audit logs for important actions:
  - Upload initiated.
  - Upload completed.
  - File downloaded.
  - Share link created.
  - Share link used.
  - File deleted.
  - Group membership changed.

## Current Product Decisions

- Use Next.js and TypeScript for both frontend and backend.
- Use Better Auth.
- Use PostgreSQL for user information and file metadata.
- Use S3-compatible object storage, preferably Cloudflare R2.
- Use direct browser-to-object-storage uploads with signed multipart URLs.
- Use browser-native previews only for the initial version.
- Initial scale target is 10 to 15 production users.
- Do not use Go.
- Do not use Java.

## Open Decisions

These choices are not final yet:

- Drizzle vs Prisma, though Drizzle is preferred.
- Cloudflare R2 vs AWS S3, though R2 is preferred for initial cost and simplicity.
- Exact hosting provider.
- Exact Redis provider.
- Exact upload UI library. Uppy is a candidate, but a custom multipart upload client is also acceptable.

## Agent Instructions

When modifying this project:

- Preserve the direct-to-object-storage upload architecture.
- Do not route large file bytes through Next.js.
- Keep route handlers thin.
- Put business logic in server modules.
- Use transactions for quota-sensitive operations.
- Prefer explicit permission checks over scattered inline conditions.
- Keep object storage private.
- Use short-lived signed URLs.
- Update this document when architectural decisions change.