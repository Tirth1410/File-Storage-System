# Contract: POST /api/files/bulk-move

**Status**: EXISTING (validate only) — defined at `app/api/files/bulk-move/route.ts`

Moves a set of files and/or folders into a target folder in one action.

## Request

`POST /api/files/bulk-move` — `Content-Type: application/json`, authenticated
(Better Auth session via `getRequestUser`).

```jsonc
{
  "fileIds": ["file_1", "file_2"], // optional, non-empty unless selectAll
  "folderIds": ["folder_1"], // optional
  "targetFolderId": "target_1", // string | null (null = root)
  "selectAll": false, // boolean; true = every item in source
  "folderId": "current_folder", // optional; source folder for selectAll
  "excludeIds": ["file_3"], // optional; items to exclude when selectAll
}
```

## Response

`200 OK`:

```jsonc
{
  "moved": [{ "id": "file_1", "type": "file" }],
  "skipped": [{ "id": "file_4", "type": "file", "reason": "not available" }],
  "forbidden": [{ "id": "folder_9", "type": "folder" }],
  "notFound": [],
  "failed": [],
}
```

## Errors

| Status | Body `error`                                      |
| ------ | ------------------------------------------------- |
| 401    | `Unauthorized`                                    |
| 400    | `At least one file or folder is required`         |
| 403    | `Forbidden` (target not owned, or item not owned) |
| 404    | `Target folder not found`                         |
| 409    | `... already exists` (name collision in target)   |
| 500    | `Internal Server Error`                           |

## Constraints

- Target folder must be owned by caller or caller is admin.
- Moving a folder into itself or a descendant is rejected (cycle prevention).
- Only `status == "available"` files are moved; others land in `skipped`.
- Partial success: valid items move even if some fail (`failed`/`skipped`).
