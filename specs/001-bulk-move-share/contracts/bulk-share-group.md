# Contract: POST /api/files/bulk-share/group

**Status**: NEW — share all selected files with one group at uniform
preview/download settings.

## Request

`POST /api/files/bulk-share/group` — `Content-Type: application/json`,
authenticated.

```jsonc
{
  "fileIds": ["file_1", "file_2"], // required, ≥1
  "groupId": "group_1", // required
  "allowPreview": true, // optional, default true
  "allowDownload": false, // optional, default true
}
```

## Response

`200 OK`:

```jsonc
{
  "shared": [{ "fileId": "file_1", "groupId": "group_1" }],
  "skipped": [{ "fileId": "file_3", "reason": "not available" }],
  "notFound": [],
  "forbidden": [],
}
```

Every shared file gets a `GroupFile` row upserted with the same
`allowPreview`/`allowDownload` and `isActive: true` (FR-006, FR-008).

## Errors

| Status | Body `error`                                                       |
| ------ | ------------------------------------------------------------------ |
| 401    | `Unauthorized`                                                     |
| 400    | `groupId is required` / `At least one file is required`            |
| 403    | `Forbidden` (file not owned, or caller not a group member / admin) |
| 404    | `File not found` / `Group not found`                               |
| 500    | `Internal Server Error`                                            |

## Constraints

- Caller MUST own each file or be system admin.
- Caller MUST be a member of the group (any role) or be system admin — same rule
  as `groupService.shareFileWithGroup`.
- Existing `GroupFile` rows are updated, never duplicated.
- One audit entry (`action: "group_file_shared"`) per file.
