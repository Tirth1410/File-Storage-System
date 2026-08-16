# Contract — Bulk Operations HTTP API

**Feature**: `specs/002-bulk-ops-performance` | **Date**: 2026-08-15
**Scope**: The three bulk endpoints this feature changes:
`POST /api/files/bulk-move`, `POST /api/files/bulk-share`,
`POST /api/files/bulk-share/group`. Auth for all: session via
`getRequestUser(request)`; missing session → `401 { "error": "Unauthorized" }`.

## Shared rules

- **Auth**: all endpoints require a session user; `401` otherwise.
- **Cap**: after select-all resolution, a request whose resolved item count
  exceeds 500 (`MAX_BULK_OPERATION_ITEMS`) is rejected with
  `400 { "error": "Cannot move/share more than 500 items at once" }` _before any
  state change_ (FR-004, SC-005). Message wording mirrors the existing bulk
  delete error ("Cannot delete more than 500 items at once",
  `app/lib/file-service.ts:550`).
- **Select-all**: the fields `selectAll: boolean`, `folderId` (source folder id
  for resolution, nullable), and `excludeIds: string[]` are now accepted by all
  three endpoints. When `selectAll` is true the server resolves the full
  selection server-side (owned items with `status: "available"` in the source
  folder, minus `excludeIds`), matching the existing bulk move/delete behavior
  (FR-006).
- **Errors**: single error shape `{ "error": string }`. `500` responses must
  never expose raw transaction/timeout internals (FR-011); existing error
  mapping in each route is preserved and extended for the cap (400).

## POST /api/files/bulk-move

Request body:

| Field            | Type             | Notes                                          |
| ---------------- | ---------------- | ---------------------------------------------- |
| `fileIds`        | `string[]`       | explicit file ids (ignored when `selectAll`)   |
| `folderIds`      | `string[]`       | explicit folder ids (ignored when `selectAll`) |
| `targetFolderId` | `string \| null` | destination; `null` = root                     |
| `selectAll`      | `boolean`        | resolve all items in `folderId` server-side    |
| `folderId`       | `string \| null` | source folder for select-all resolution        |
| `excludeIds`     | `string[]`       | ids to exclude from a select-all selection     |

Validation: at least one of `fileIds`/`folderIds`/`selectAll` → else `400
{ "error": "At least one file or folder is required" }`. Cap as above on
`fileIds.length + folderIds.length` (post-resolution).

Response `200` — unchanged shape (per-item outcomes preserved, FR-008):

```json
{
  "moved": [{ "id": "…", "type": "file" }],
  "forbidden": [{ "id": "…", "type": "folder" }],
  "notFound": [{ "id": "…", "type": "file" }],
  "failed": [{ "id": "…", "type": "folder", "reason": "…" }],
  "skipped": [{ "id": "…", "type": "file", "reason": "…" }]
}
```

Error mapping (existing): `Forbidden` → 403; `Target folder not found` → 404;
name-conflict messages → 409; cap → 400; else 500.

## POST /api/files/bulk-share

Request body:

| Field        | Type                | Notes                                            |
| ------------ | ------------------- | ------------------------------------------------ |
| `fileIds`    | `string[]`          | explicit file ids (ignored when `selectAll`)     |
| `email`      | `string`            | recipient email (lowercased/trimmed server-side) |
| `permission` | `"read" \| "write"` | default `read`                                   |
| `selectAll`  | `boolean`           | resolve all files in `folderId` server-side      |
| `folderId`   | `string \| null`    | source folder for select-all resolution          |
| `excludeIds` | `string[]`          | ids to exclude from a select-all selection       |

Validation: `fileIds` non-empty (or `selectAll`), `email` required → else `400`.
Cap on resolved file count → 400.

Response `200` — unchanged shape:

```json
{
  "shared": [{ "fileId": "…", "permission": "read" }],
  "invites": [{ "fileId": "…", "emailSent": true, "inviteId": "…" }],
  "skipped": [{ "fileId": "…", "reason": "…" }],
  "notFound": [{ "fileId": "…" }],
  "forbidden": [{ "fileId": "…" }]
}
```

When the recipient has an account, `shared` is populated and `invites` empty;
when not, `invites` is populated and `shared` empty (existing semantics).

Error mapping (existing): `Forbidden` → 403; `You cannot share with yourself` →
400; cap → 400; else 500.

## POST /api/files/bulk-share/group

Request body:

| Field           | Type             | Notes                                        |
| --------------- | ---------------- | -------------------------------------------- |
| `fileIds`       | `string[]`       | explicit file ids (ignored when `selectAll`) |
| `groupId`       | `string`         | target group                                 |
| `allowPreview`  | `boolean`        | default `true`                               |
| `allowDownload` | `boolean`        | default `true`                               |
| `selectAll`     | `boolean`        | resolve all files in `folderId` server-side  |
| `folderId`      | `string \| null` | source folder for select-all resolution      |
| `excludeIds`    | `string[]`       | ids to exclude from a select-all selection   |

Validation: `fileIds` non-empty (or `selectAll`), `groupId` required → else
`400`. Cap on resolved file count → 400.

Response `200` — unchanged shape:

```json
{
  "shared": [{ "fileId": "…", "groupId": "…" }],
  "skipped": [{ "fileId": "…", "reason": "…" }],
  "notFound": [{ "fileId": "…" }],
  "forbidden": [{ "fileId": "…" }]
}
```

Error mapping (existing): `Forbidden` / `You must be a member of the group …` →
403; `Group not found` → 404; cap → 400; else 500.

## Client contract (dashboard + share modal)

- `handleBatchShare` (`app/dashboard/page.tsx:401`) forwards the current
  selection context: when in select-all mode it sends `selectAll: true`,
  `folderId: currentFolderId`, `excludeIds` (deselected ids), else explicit
  `fileIds`.
- `ShareModal` / `FileAccessManager` accept and forward optional
  `selectAll`/`sourceFolderId`/`excludeIds` to both bulk-share endpoints, so the
  modal count and the actual selection stay consistent (server returns the
  authoritative per-item outcome).

## Interaction with existing non-bulk endpoints

Single-item share endpoints (`/api/files/[id]/share`, `/permissions`,
`/groups`) are untouched; they continue to use the per-item
`auditService.log` path. Only the bulk endpoints switch to set-based writes and
batched audit.
