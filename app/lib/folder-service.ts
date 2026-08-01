import prisma from "@/app/lib/prisma";
import { r2Service } from "@/app/lib/r2";
import { auditService } from "@/app/lib/audit-service";
import { Prisma } from "@/app/generated/prisma/client";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  FILE_CURSOR_ORDER_BY,
  fileCursorWhere,
  computeFilePage,
} from "@/app/lib/pagination";

const DEFAULT_QUOTA_BYTES = BigInt(200 * 1024 * 1024);

// Prisma interactive transactions default to maxWait 2000ms / timeout 5000ms,
// which is too tight when deleting a large folder tree while other quota
// transactions (e.g. concurrent uploads) hold the quota_usage row lock.
const TRANSACTION_TIMEOUT = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

function getDescendantCteSql(): string {
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
