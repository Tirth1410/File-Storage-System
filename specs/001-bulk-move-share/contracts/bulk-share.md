# Contract: POST /api/files/bulk-share

**Status**: NEW — share all selected files with one user (by email) at a uniform
permission level.

## Request

`POST /api/files/bulk-share` — `Content-Type: application/json`, authenticated.

```jsonc
{
  "fileIds": ["file_1", "file_2", "file_3"], // required, ≥1
  "email": "colleague@example.com", // required, normalized
  "permission": "read", // optional, "read" | "write", default "read"
}
```

## Response

`200 OK` — mirrors the `BulkMoveResult` bucket shape for UI consistency:

```jsonc
{
  "shared": [{ "fileId": "file_1", "permission": "read" }],
  "invites": [{ "fileId": "file_5", "emailSent": true, "inviteId": "inv_1" }],
  "skipped": [{ "fileId": "file_7", "reason": "owned by recipient" }],
  "notFound": [],
  "forbidden": [],
}
```

- `shared`: files where the recipient already has an account — `FilePermission`
  upserted at `permission`.
- `invites`: files where the email has no account — a PENDING `Invitation`
  created and invite email attempted (existing single-file behavior).
- `skipped`: ineligible items with a reason (e.g., `status != "available"`,
  `owned by recipient`). Never silently dropped.

## Errors

| Status | Body `error`                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| 401    | `Unauthorized`                                                                                                |
| 400    | `At least one file is required` / `Email is required` / `You cannot share with yourself` / invalid permission |
| 403    | `Forbidden` (caller not owner/admin of the files)                                                             |
| 500    | `Internal Server Error`                                                                                       |

## Constraints

- Caller MUST own every file or be system admin (checked per file).
- `email` normalized to trim/lowercase before lookup.
- Recipient's own files are excluded and reported in `skipped` (FR-010).
- Permission coerced to `"read" | "write"` only (FR-005).
- Writes happen in a single transaction; a per-file failure reports in buckets
  and does not roll back valid files (FR-011).
