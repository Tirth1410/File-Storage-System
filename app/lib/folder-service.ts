import prisma from "@/app/lib/prisma";
import { r2Service } from "@/app/lib/r2";
import { auditService } from "@/app/lib/audit-service";
import { Prisma } from "@/app/generated/prisma/client";
import { buildDescendantCheckSql, validateItemCount } from "@/app/lib/bulk";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  FILE_CURSOR_ORDER_BY,
  fileCursorWhere,
  computeFilePage,
} from "@/app/lib/pagination";

const DEFAULT_QUOTA_BYTES = BigInt(200 * 1024 * 1024);

export interface BulkMoveEntry {
  id: string;
  type: "file" | "folder";
  reason?: string;
}

export interface BulkMoveResult {
  moved: BulkMoveEntry[];
  forbidden: BulkMoveEntry[];
  notFound: BulkMoveEntry[];
  failed: BulkMoveEntry[];
  skipped: BulkMoveEntry[];
}

// Prisma interactive transactions default to maxWait 2000ms / timeout 5000ms,
// which is too tight when deleting a large folder tree while other quota
// transactions (e.g. concurrent uploads) hold the quota_usage row lock.
const TRANSACTION_TIMEOUT = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

export function getDescendantCteSql(): string {
  return `WITH RECURSIVE subtree AS (
    SELECT id, "parentFolderId" FROM folder WHERE id = $1
    UNION ALL
    SELECT f.id, f."parentFolderId" FROM folder f
    INNER JOIN subtree s ON f."parentFolderId" = s.id
  )
  SELECT id FROM subtree`;
}

function getBreadcrumbCteSql(): string {
  return `WITH RECURSIVE path AS (
    SELECT id, name, "parentFolderId", 0 AS depth FROM folder WHERE id = $1
    UNION ALL
    SELECT f.id, f.name, f."parentFolderId", p.depth - 1
    FROM folder f
    INNER JOIN path p ON f.id = p."parentFolderId"
  )
  SELECT id, name FROM path ORDER BY depth`;
}

export const folderService = {
  async createFolder(
    name: string,
    parentFolderId: string | null,
    userId: string,
  ) {
    if (parentFolderId) {
      const parent = await prisma.folder.findUnique({
        where: { id: parentFolderId },
      });
      if (!parent) {
        throw new Error("Parent folder not found");
      }
      if (parent.ownerUserId !== userId) {
        throw new Error("Forbidden");
      }
    }

    const existing = await prisma.folder.findFirst({
      where: {
        ownerUserId: userId,
        parentFolderId: parentFolderId,
        name,
      },
    });
    if (existing) {
      throw new Error(
        "A folder with this name already exists in this location",
      );
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        ownerUserId: userId,
        parentFolderId,
      },
    });

    await auditService.log({
      userId,
      action: "folder_created",
      folderId: folder.id,
      details: `Created folder "${name}"${parentFolderId ? ` in folder ${parentFolderId}` : " at root"}`,
    });

    return folder;
  },

  async listRootFolders(userId: string) {
    return await prisma.folder.findMany({
      where: {
        ownerUserId: userId,
        parentFolderId: null,
      },
      orderBy: { name: "asc" },
    });
  },

  async getFolderContents(
    folderId: string | null,
    userId: string,
    limit = DEFAULT_PAGE_SIZE,
    cursor?: string | null,
  ) {
    const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);

    const baseWhere: Prisma.FileWhereInput = {
      ownerUserId: userId,
      folderId: folderId,
      status: "available",
    };

    const [folders, totalFiles, fileRows] = await Promise.all([
      prisma.folder.findMany({
        where: {
          ownerUserId: userId,
          parentFolderId: folderId,
        },
        orderBy: { name: "asc" },
      }),
      prisma.file.count({
        where: baseWhere,
      }),
      prisma.file.findMany({
        where: {
          ...baseWhere,
          ...fileCursorWhere(cursor ?? null),
        },
        orderBy: FILE_CURSOR_ORDER_BY,
        take: safeLimit + 1,
      }),
    ]);

    const {
      items: pagedFiles,
      hasMore,
      nextCursor,
    } = computeFilePage(fileRows, safeLimit);

    const serializedFiles = pagedFiles.map((file) => ({
      ...file,
      sizeBytes: file.sizeBytes.toString(),
    }));

    return {
      folders,
      files: serializedFiles,
      totalItems: folders.length + totalFiles,
      totalFiles,
      totalFolders: folders.length,
      limit: safeLimit,
      hasMore,
      nextCursor,
    };
  },

  async renameFolder(
    folderId: string,
    newName: string,
    userId: string,
    isAdmin = false,
  ) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });
    if (!folder) {
      throw new Error("Folder not found");
    }
    if (folder.ownerUserId !== userId && !isAdmin) {
      throw new Error("Forbidden");
    }

    const existing = await prisma.folder.findFirst({
      where: {
        ownerUserId: folder.ownerUserId,
        parentFolderId: folder.parentFolderId,
        name: newName,
        id: { not: folderId },
      },
    });
    if (existing) {
      throw new Error(
        "A folder with this name already exists in this location",
      );
    }

    const updated = await prisma.folder.update({
      where: { id: folderId },
      data: { name: newName },
    });

    await auditService.log({
      userId,
      action: "folder_renamed",
      folderId,
      details: `Renamed folder from "${folder.name}" to "${newName}"`,
    });

    return updated;
  },

  async deleteFolder(folderId: string, userId: string, isAdmin = false) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });
    if (!folder) {
      return { success: true, message: "Folder already deleted or not found" };
    }
    if (folder.ownerUserId !== userId && !isAdmin) {
      throw new Error("Forbidden");
    }

    const descendantRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      getDescendantCteSql(),
      folderId,
    );
    const allFolderIds = descendantRows.map((r) => r.id);

    const filesInTree = await prisma.file.findMany({
      where: { folderId: { in: allFolderIds } },
    });

    if (filesInTree.length > 0) {
      try {
        const { errors } = await r2Service.deleteObjects(
          filesInTree.map((f) => f.objectKey),
        );
        if (errors.length > 0) {
          const keys = errors.map((e) => e.key).join(", ");
          throw new Error(`Failed to delete from R2: ${keys}`);
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.startsWith("Failed to delete from R2")
        ) {
          throw err;
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      if (filesInTree.length > 0) {
        const totalBytes = filesInTree.reduce(
          (acc, f) => acc + f.sizeBytes,
          BigInt(0),
        );

        await tx.quotaUsage.upsert({
          where: { userId: folder.ownerUserId },
          create: {
            userId: folder.ownerUserId,
            quotaBytes: DEFAULT_QUOTA_BYTES,
            usedBytes: BigInt(0),
          },
          update: {},
        });

        const lockedRows = await tx.$queryRawUnsafe<{ used_bytes: string }[]>(
          `SELECT used_bytes FROM quota_usage WHERE user_id = $1 FOR UPDATE`,
          folder.ownerUserId,
        );

        if (lockedRows.length > 0) {
          const usedBytes = BigInt(lockedRows[0].used_bytes);
          const newUsed =
            usedBytes >= totalBytes ? usedBytes - totalBytes : BigInt(0);

          await tx.quotaUsage.update({
            where: { userId: folder.ownerUserId },
            data: { usedBytes: newUsed },
          });
        }

        await tx.file.deleteMany({
          where: { id: { in: filesInTree.map((f) => f.id) } },
        });

        for (const file of filesInTree) {
          await auditService.log({
            userId,
            action: "file_deleted",
            fileId: file.id,
            details: `Permanently deleted file ${file.originalName} (${file.sizeBytes} bytes) during folder cascade delete. Action performed by ${userId}`,
          });
        }
      }

      await tx.folder.deleteMany({
        where: { id: { in: allFolderIds } },
      });

      await auditService.log({
        userId,
        action: "folder_deleted",
        folderId,
        details: `Deleted folder "${folder.name}" and ${allFolderIds.length - 1} subfolder(s) containing ${filesInTree.length} file(s)`,
      });
    }, TRANSACTION_TIMEOUT);

    return { success: true };
  },

  async moveFolder(
    folderId: string,
    newParentFolderId: string | null,
    userId: string,
    isAdmin = false,
  ) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });
    if (!folder) {
      throw new Error("Folder not found");
    }
    if (folder.ownerUserId !== userId && !isAdmin) {
      throw new Error("Forbidden");
    }

    if (newParentFolderId) {
      const newParent = await prisma.folder.findUnique({
        where: { id: newParentFolderId },
      });
      if (!newParent) {
        throw new Error("Target folder not found");
      }
      if (newParent.ownerUserId !== userId && !isAdmin) {
        throw new Error("Forbidden");
      }

      const descendantRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        getDescendantCteSql(),
        folderId,
      );
      const descendantIds = descendantRows.map((r) => r.id);
      if (descendantIds.includes(newParentFolderId)) {
        throw new Error(
          "Cannot move a folder into itself or one of its descendants",
        );
      }
    }

    const existing = await prisma.folder.findFirst({
      where: {
        ownerUserId: folder.ownerUserId,
        parentFolderId: newParentFolderId,
        name: folder.name,
        id: { not: folderId },
      },
    });
    if (existing) {
      throw new Error(
        "A folder with this name already exists in the target location",
      );
    }

    const updated = await prisma.folder.update({
      where: { id: folderId },
      data: { parentFolderId: newParentFolderId },
    });

    await auditService.log({
      userId,
      action: "folder_moved",
      folderId,
      details: `Moved folder "${folder.name}"${newParentFolderId ? ` to folder ${newParentFolderId}` : " to root"}`,
    });

    return updated;
  },

  async moveFile(
    fileId: string,
    targetFolderId: string | null,
    userId: string,
    isAdmin = false,
  ) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });
    if (!file) {
      throw new Error("File not found");
    }
    if (file.ownerUserId !== userId && !isAdmin) {
      throw new Error("Forbidden");
    }

    if (targetFolderId) {
      const target = await prisma.folder.findUnique({
        where: { id: targetFolderId },
      });
      if (!target) {
        throw new Error("Target folder not found");
      }
      if (target.ownerUserId !== userId && !isAdmin) {
        throw new Error("Forbidden");
      }
    }

    const updated = await prisma.file.update({
      where: { id: fileId },
      data: { folderId: targetFolderId },
    });

    await auditService.log({
      userId,
      action: "file_moved",
      fileId,
      details: `Moved file "${file.originalName}"${targetFolderId ? ` to folder ${targetFolderId}` : " to root"}`,
    });

    return updated;
  },

  async bulkMove({
    fileIds = [],
    folderIds = [],
    targetFolderId,
    selectAll = false,
    sourceFolderId = null,
    excludeIds = [],
    userId,
    isAdmin = false,
  }: {
    fileIds?: string[];
    folderIds?: string[];
    targetFolderId: string | null;
    selectAll?: boolean;
    sourceFolderId?: string | null;
    excludeIds?: string[];
    userId: string;
    isAdmin?: boolean;
  }): Promise<BulkMoveResult> {
    if (targetFolderId) {
      const target = await prisma.folder.findUnique({
        where: { id: targetFolderId },
      });
      if (!target) {
        throw new Error("Target folder not found");
      }
      if (target.ownerUserId !== userId && !isAdmin) {
        throw new Error("Forbidden");
      }
    }

    let fileEntryIds = Array.from(new Set(fileIds.filter(Boolean)));
    let folderEntryIds = Array.from(new Set(folderIds.filter(Boolean)));
    const excluded = new Set(excludeIds);

    if (selectAll) {
      const [allFolders, allFiles] = await Promise.all([
        prisma.folder.findMany({
          where: {
            ownerUserId: userId,
            parentFolderId: sourceFolderId ?? null,
          },
          select: { id: true },
        }),
        prisma.file.findMany({
          where: {
            ownerUserId: userId,
            folderId: sourceFolderId ?? null,
            status: "available",
          },
          select: { id: true },
        }),
      ]);
      folderEntryIds = allFolders
        .map((f) => f.id)
        .filter((id) => !excluded.has(id));
      fileEntryIds = allFiles
        .map((f) => f.id)
        .filter((id) => !excluded.has(id));
    }

    validateItemCount(fileEntryIds.length + folderEntryIds.length, "move");

    const [folderRows, fileRows] = await Promise.all([
      folderEntryIds.length > 0
        ? prisma.folder.findMany({ where: { id: { in: folderEntryIds } } })
        : Promise.resolve([]),
      fileEntryIds.length > 0
        ? prisma.file.findMany({ where: { id: { in: fileEntryIds } } })
        : Promise.resolve([]),
    ]);
    const folderById = new Map(folderRows.map((f) => [f.id, f]));
    const fileById = new Map(fileRows.map((f) => [f.id, f]));

    const moved: BulkMoveEntry[] = [];
    const forbidden: BulkMoveEntry[] = [];
    const notFound: BulkMoveEntry[] = [];
    const failed: BulkMoveEntry[] = [];
    const skipped: BulkMoveEntry[] = [];

    const validFolders: (typeof folderRows)[number][] = [];
    for (const id of folderEntryIds) {
      const row = folderById.get(id);
      if (!row) {
        notFound.push({ id, type: "folder" });
        continue;
      }
      if (row.ownerUserId !== userId && !isAdmin) {
        forbidden.push({ id, type: "folder" });
        continue;
      }
      if (row.parentFolderId === targetFolderId) {
        skipped.push({ id, type: "folder" });
        continue;
      }
      validFolders.push(row);
    }

    const validFiles: (typeof fileRows)[number][] = [];
    for (const id of fileEntryIds) {
      const row = fileById.get(id);
      if (!row) {
        notFound.push({ id, type: "file" });
        continue;
      }
      if (row.ownerUserId !== userId && !isAdmin) {
        forbidden.push({ id, type: "file" });
        continue;
      }
      if (row.status !== "available") {
        skipped.push({ id, type: "file", reason: "not available" });
        continue;
      }
      if (row.folderId === targetFolderId) {
        skipped.push({ id, type: "file" });
        continue;
      }
      validFiles.push(row);
    }

    const foldersToMove: (typeof folderRows)[number][] = [];
    if (targetFolderId && validFolders.length > 0) {
      const blockedRows = await prisma.$queryRaw<{ root_id: string }[]>(
        buildDescendantCheckSql(
          validFolders.map((f) => f.id),
          targetFolderId,
        ),
      );
      const blocked = new Set(blockedRows.map((r) => r.root_id));
      for (const folder of validFolders) {
        if (blocked.has(folder.id)) {
          failed.push({
            id: folder.id,
            type: "folder",
            reason:
              "Cannot move a folder into itself or one of its descendants",
          });
        } else {
          foldersToMove.push(folder);
        }
      }
    } else {
      foldersToMove.push(...validFolders);
    }

    if (targetFolderId && foldersToMove.length > 0) {
      const movedIds = foldersToMove.map((f) => f.id);
      const nameRows = await prisma.folder.findMany({
        where: {
          parentFolderId: targetFolderId,
          name: { in: foldersToMove.map((f) => f.name) },
          id: { notIn: movedIds },
        },
        select: { ownerUserId: true, name: true },
      });
      const taken = new Set(nameRows.map((r) => `${r.ownerUserId}:${r.name}`));
      const filtered: (typeof foldersToMove)[number][] = [];
      for (const folder of foldersToMove) {
        if (taken.has(`${folder.ownerUserId}:${folder.name}`)) {
          failed.push({
            id: folder.id,
            type: "folder",
            reason:
              "A folder with this name already exists in the target location",
          });
        } else {
          filtered.push(folder);
        }
      }
      foldersToMove.splice(0, foldersToMove.length, ...filtered);
    }

    const filesToMove = validFiles;

    if (foldersToMove.length === 0 && filesToMove.length === 0) {
      return { moved, forbidden, notFound, failed, skipped };
    }

    await prisma.$transaction(async (tx) => {
      if (foldersToMove.length > 0) {
        await tx.folder.updateMany({
          where: { id: { in: foldersToMove.map((f) => f.id) } },
          data: { parentFolderId: targetFolderId },
        });
      }
      if (filesToMove.length > 0) {
        await tx.file.updateMany({
          where: { id: { in: filesToMove.map((f) => f.id) } },
          data: { folderId: targetFolderId },
        });
      }
      const auditRows = [
        ...foldersToMove.map((folder) => ({
          userId,
          action: "folder_moved",
          folderId: folder.id,
          details: `Moved folder "${folder.name}" to ${targetFolderId ?? "root"} via bulk move`,
        })),
        ...filesToMove.map((file) => ({
          userId,
          action: "file_moved",
          fileId: file.id,
          details: `Moved file "${file.originalName}" to ${targetFolderId ?? "root"} via bulk move`,
        })),
      ];
      if (auditRows.length > 0) {
        await tx.auditLog.createMany({ data: auditRows });
      }
    }, TRANSACTION_TIMEOUT);

    for (const folder of foldersToMove) {
      moved.push({ id: folder.id, type: "folder" });
    }
    for (const file of filesToMove) {
      moved.push({ id: file.id, type: "file" });
    }

    return { moved, forbidden, notFound, failed, skipped };
  },

  async getBreadcrumb(folderId: string, userId: string) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });
    if (!folder) {
      throw new Error("Folder not found");
    }
    if (folder.ownerUserId !== userId) {
      throw new Error("Forbidden");
    }

    const rows = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
      getBreadcrumbCteSql(),
      folderId,
    );

    return rows;
  },

  async getFolderChildren(folderId: string, userId: string) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });
    if (!folder) {
      throw new Error("Folder not found");
    }
    if (folder.ownerUserId !== userId) {
      throw new Error("Forbidden");
    }

    return await prisma.folder.findMany({
      where: {
        parentFolderId: folderId,
        ownerUserId: userId,
      },
      orderBy: { name: "asc" },
    });
  },
};
