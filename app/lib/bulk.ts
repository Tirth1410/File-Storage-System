import { randomUUID } from "crypto";
import { Prisma } from "@/app/generated/prisma/client";

export const MAX_BULK_OPERATION_ITEMS = 500;

export class BulkOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BulkOperationError";
  }
}

export function validateItemCount(
  count: number,
  verb: "move" | "share" | "delete",
): void {
  if (count > MAX_BULK_OPERATION_ITEMS) {
    throw new BulkOperationError(
      `Cannot ${verb} more than ${MAX_BULK_OPERATION_ITEMS} items at once`,
    );
  }
}

// Prisma interactive transactions default to maxWait 2000ms / timeout 5000ms,
// which is too tight for bulk operations over a pooled connection while other
// quota transactions (e.g. concurrent uploads) hold row locks.
export const BULK_TRANSACTION_TIMEOUT = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

export interface GroupFileUpsertRow {
  groupId: string;
  fileId: string;
  sharedByUserId: string;
  allowPreview: boolean;
  allowDownload: boolean;
}

export function buildGroupFileUpsertSql(
  rows: GroupFileUpsertRow[],
): Prisma.Sql {
  const values = Prisma.join(
    rows.map(
      (row) =>
        Prisma.sql`(${randomUUID()}, ${row.groupId}, ${row.fileId}, ${row.sharedByUserId}, ${row.allowPreview}, ${row.allowDownload}, true, now(), now())`,
    ),
  );
  return Prisma.sql`
    INSERT INTO group_file (id, "groupId", "fileId", "sharedByUserId", "allowPreview", "allowDownload", "isActive", "sharedAt", "updatedAt")
    VALUES ${values}
    ON CONFLICT ("groupId", "fileId") DO UPDATE SET
      "allowPreview" = EXCLUDED."allowPreview",
      "allowDownload" = EXCLUDED."allowDownload",
      "isActive" = true,
      "updatedAt" = now()
  `;
}

export interface FilePermissionUpsertRow {
  fileId: string;
  userId: string;
  permission: "read" | "write";
}

export function buildFilePermissionUpsertSql(
  rows: FilePermissionUpsertRow[],
): Prisma.Sql {
  const values = Prisma.join(
    rows.map(
      (row) =>
        Prisma.sql`(${randomUUID()}, ${row.fileId}, ${row.userId}, ${row.permission}, now(), now())`,
    ),
  );
  return Prisma.sql`
    INSERT INTO file_permission (id, "fileId", "userId", permission, "createdAt", "updatedAt")
    VALUES ${values}
    ON CONFLICT ("fileId", "userId") DO UPDATE SET
      permission = EXCLUDED.permission,
      "updatedAt" = now()
  `;
}

// Single query answering "which of the selected folders has the target folder
// inside its own subtree?" (including the target itself, i.e. self-move).
export function buildDescendantCheckSql(
  selectedFolderIds: string[],
  targetFolderId: string,
): Prisma.Sql {
  return Prisma.sql`
    WITH RECURSIVE subtree AS (
      SELECT id, "parentFolderId", id AS root_id FROM folder
      WHERE id IN (${Prisma.join(selectedFolderIds)})
      UNION ALL
      SELECT f.id, f."parentFolderId", s.root_id FROM folder f
      INNER JOIN subtree s ON f."parentFolderId" = s.id
    )
    SELECT DISTINCT root_id FROM subtree WHERE id = ${targetFolderId}
  `;
}
