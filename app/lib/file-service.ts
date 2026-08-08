import prisma from "@/app/lib/prisma";
import { r2Service } from "@/app/lib/r2";
import { auditService } from "@/app/lib/audit-service";
import { logger } from "@/app/lib/logger";
import { getDescendantCteSql } from "@/app/lib/folder-service";

export interface InitiateUploadInput {
  filename: string;
  size: number;
  mimeType: string;
  userId: string;
  folderId?: string | null;
}

export interface CompleteUploadInput {
  uploadId: string;
  objectKey: string;
  parts: { partNumber: number; etag: string }[];
  userId: string;
}

export interface AbortUploadInput {
  uploadId: string;
  objectKey: string;
  userId: string;
}

export interface BulkDeleteResult {
  deleted: string[];
  foldersDeleted: string[];
  forbidden: string[];
  notFound: string[];
  failed: { id: string; reason: string }[];
}

export interface SharedRemoveResult {
  removed: string[];
  owned: string[];
  notFound: string[];
  failed: { id: string; reason: string }[];
}

export class BulkDeleteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BulkDeleteValidationError";
  }
}

const PART_SIZE_BYTES = 8 * 1024 * 1024; // 8MB default chunk size
const DEFAULT_QUOTA_BYTES = BigInt(200 * 1024 * 1024); // 200 MB
const MAX_BULK_DELETE_FILES = 500;

// Prisma interactive transactions default to maxWait 2000ms / timeout 5000ms,
// which is too tight when several concurrent uploads serialize on the
// quota_usage row lock (3 parallel upload workers) over a pooled connection.
const TRANSACTION_TIMEOUT = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

export const fileService = {
  async initiateUpload({
    filename,
    size,
    mimeType,
    userId,
    folderId,
  }: InitiateUploadInput) {
    // Generate file ID and key beforehand
    const fileId = crypto.randomUUID();
    const fileExtension = filename.split(".").pop();
    const objectKey = `${userId}/${fileId}${fileExtension ? `.${fileExtension}` : ""}`;

    // 1. Initiate multipart upload on R2 OUTSIDE the transaction
    const { uploadId } = await r2Service.initializeMultipartUpload(
      objectKey,
      mimeType,
    );

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 2. Ensure quota_usage record exists
        await tx.quotaUsage.upsert({
          where: { userId },
          create: {
            userId,
            quotaBytes: DEFAULT_QUOTA_BYTES,
            usedBytes: BigInt(0),
          },
          update: {},
        });

        // 3. Lock quota_usage row for update to prevent race conditions
        const lockedRows = await tx.$queryRawUnsafe<
          { quota_bytes: string; used_bytes: string }[]
        >(
          `SELECT quota_bytes, used_bytes FROM quota_usage WHERE user_id = $1 FOR UPDATE`,
          userId,
        );

        const locked = lockedRows[0];
        const quotaBytes = BigInt(locked.quota_bytes);
        const usedBytes = BigInt(locked.used_bytes);

        const requestedSize = BigInt(size);
        const availableBytes = quotaBytes - usedBytes;

        if (requestedSize > availableBytes) {
          throw new Error(
            "Quota exceeded: Not enough storage space available.",
          );
        }

        // 4. Create the file record in DB with status "uploading"
        const file = await tx.file.create({
          data: {
            id: fileId,
            ownerUserId: userId,
            folderId: folderId ?? null,
            bucket: process.env.R2_BUCKET!,
            objectKey,
            originalName: filename,
            mimeType,
            sizeBytes: requestedSize,
            status: "uploading",
            visibility: "private",
          },
        });

        // 5. Create the upload session record in DB
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const uploadSession = await tx.uploadSession.create({
          data: {
            fileId: file.id,
            userId,
            storageUploadId: uploadId,
            objectKey,
            sizeBytes: requestedSize,
            partSizeBytes: BigInt(PART_SIZE_BYTES),
            status: "initiated",
            expiresAt,
          },
        });

        return {
          uploadId: uploadSession.storageUploadId,
          objectKey: uploadSession.objectKey,
          fileId: file.id,
          partSizeBytes: PART_SIZE_BYTES,
        };
      }, TRANSACTION_TIMEOUT);

      // 6. Write audit log outside the transaction so the quota row lock is
      // held as briefly as possible while concurrent uploads are queued.
      await auditService.log({
        userId,
        action: "upload_initiated",
        fileId: result.fileId,
        details: `Initiated upload of file ${filename} (${size} bytes)`,
      });

      return result;
    } catch (dbError) {
      // Clean up the R2 upload if the database transaction fails
      try {
        await r2Service.abortMultipartUpload(objectKey, uploadId);
      } catch (r2Error) {
        logger.error(
          `Failed to abort R2 upload after database transaction error:`,
          r2Error,
        );
      }
      throw dbError;
    }
  },

  async signPart(
    uploadId: string,
    objectKey: string,
    partNumber: number,
    userId: string,
  ) {
    // Verify the upload session exists and belongs to the user
    const uploadSession = await prisma.uploadSession.findFirst({
      where: {
        storageUploadId: uploadId,
        objectKey,
        userId,
        status: { in: ["initiated", "uploading"] },
      },
    });

    if (!uploadSession) {
      throw new Error("Upload session not found or inactive");
    }

    // Update status to "uploading" if it was just "initiated"
    if (uploadSession.status === "initiated") {
      await prisma.uploadSession.update({
        where: { id: uploadSession.id },
        data: { status: "uploading" },
      });
    }

    const signedUrl = await r2Service.generatePresignedPartUrl(
      objectKey,
      uploadId,
      partNumber,
    );
    return signedUrl;
  },

  async completeUpload({
    uploadId,
    objectKey,
    parts,
    userId,
  }: CompleteUploadInput) {
    const uploadSession = await prisma.uploadSession.findFirst({
      where: {
        storageUploadId: uploadId,
        objectKey,
        userId,
        status: { in: ["initiated", "uploading"] },
      },
    });

    if (!uploadSession) {
      throw new Error("Upload session not found or inactive");
    }

    // Complete upload in R2
    await r2Service.completeMultipartUpload(objectKey, uploadId, parts);

    // Update upload session, file records, and user quota in DB
    await prisma.$transaction(async (tx) => {
      // 1. Lock quota_usage
      const lockedRows = await tx.$queryRawUnsafe<{ used_bytes: string }[]>(
        `SELECT used_bytes FROM quota_usage WHERE user_id = $1 FOR UPDATE`,
        userId,
      );

      const locked = lockedRows[0];
      const usedBytes = BigInt(locked.used_bytes);

      const size = uploadSession.sizeBytes;
      const newUsed = usedBytes + size;

      await tx.quotaUsage.update({
        where: { userId },
        data: {
          usedBytes: newUsed,
        },
      });

      // 2. Update session and file
      await tx.uploadSession.update({
        where: { id: uploadSession.id },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });

      await tx.file.update({
        where: { id: uploadSession.fileId },
        data: {
          status: "available",
        },
      });

      // 3. Log audit
      await auditService.log({
        userId,
        action: "upload_success",
        fileId: uploadSession.fileId,
        details: `Successfully completed upload of file ${uploadSession.fileId} (${size} bytes)`,
      });
    }, TRANSACTION_TIMEOUT);

    return {
      fileId: uploadSession.fileId,
    };
  },

  async abortUpload({ uploadId, objectKey, userId }: AbortUploadInput) {
    const uploadSession = await prisma.uploadSession.findFirst({
      where: {
        storageUploadId: uploadId,
        objectKey,
        userId,
        status: { in: ["initiated", "uploading"] },
      },
    });

    if (!uploadSession) {
      throw new Error("Upload session not found or inactive");
    }

    // Abort in R2
    await r2Service.abortMultipartUpload(objectKey, uploadId);

    // Update DB
    await prisma.$transaction(async (tx) => {
      await tx.uploadSession.update({
        where: { id: uploadSession.id },
        data: {
          status: "aborted",
        },
      });

      await tx.file.update({
        where: { id: uploadSession.fileId },
        data: {
          status: "failed",
          deletedAt: new Date(),
        },
      });

      // Log audit
      await auditService.log({
        userId,
        action: "upload_aborted",
        fileId: uploadSession.fileId,
        details: `Aborted upload session ${uploadId}`,
      });
    }, TRANSACTION_TIMEOUT);
  },

  async deleteFile(fileId: string, userId: string, isAdmin = false) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return { success: true, message: "File already deleted or not found" };
    }

    if (file.ownerUserId !== userId && !isAdmin) {
      throw new Error("Forbidden");
    }

    // 1. Delete object from Cloudflare R2
    try {
      await r2Service.deleteObject(file.objectKey);
    } catch {
      // Continue cleanup even if object is already removed from R2
    }

    // 2. Remove all metadata from database and update user's quota
    return await prisma.$transaction(async (tx) => {
      // Cascade deletes the upload sessions referencing this file
      await tx.file.deleteMany({
        where: { id: fileId },
      });

      // Ensure quota record exists
      await tx.quotaUsage.upsert({
        where: { userId: file.ownerUserId },
        create: {
          userId: file.ownerUserId,
          quotaBytes: DEFAULT_QUOTA_BYTES,
          usedBytes: BigInt(0),
        },
        update: {},
      });

      // Lock row
      const lockedRows = await tx.$queryRawUnsafe<{ used_bytes: string }[]>(
        `SELECT used_bytes FROM quota_usage WHERE user_id = $1 FOR UPDATE`,
        file.ownerUserId,
      );

      if (lockedRows.length > 0) {
        const locked = lockedRows[0];
        const usedBytes = BigInt(locked.used_bytes);
        const size = file.sizeBytes;
        const newUsed = usedBytes >= size ? usedBytes - size : BigInt(0);

        await tx.quotaUsage.update({
          where: { userId: file.ownerUserId },
          data: {
            usedBytes: newUsed,
          },
        });
      }

      // Log audit
      await auditService.log({
        userId,
        action: "file_deleted",
        fileId,
        details: `Permanently deleted file ${file.originalName} (${file.sizeBytes} bytes) from R2 and database. Action performed by ${userId}`,
      });

      return { success: true };
    }, TRANSACTION_TIMEOUT);
  },

  async removeSharedFileAccess(
    fileId: string,
    userId: string,
  ): Promise<SharedRemoveResult> {
    return await this.bulkRemoveSharedFileAccess([fileId], userId);
  },

  async bulkRemoveSharedFileAccess(
    fileIds: string[],
    userId: string,
  ): Promise<SharedRemoveResult> {
    const uniqueFileIds = Array.from(
      new Set(fileIds.filter((id): id is string => typeof id === "string")),
    );

    if (uniqueFileIds.length === 0) {
      throw new BulkDeleteValidationError("At least one file ID is required");
    }

    if (uniqueFileIds.length > MAX_BULK_DELETE_FILES) {
      throw new BulkDeleteValidationError(
        `Cannot remove more than ${MAX_BULK_DELETE_FILES} files at once`,
      );
    }

    const files = await prisma.file.findMany({
      where: { id: { in: uniqueFileIds } },
      select: { id: true, ownerUserId: true },
    });

    const filesById = new Map(files.map((file) => [file.id, file]));
    const notFound = uniqueFileIds.filter((id) => !filesById.has(id));
    const owned = files
      .filter((file) => file.ownerUserId === userId)
      .map((file) => file.id);
    const removableIds = files
      .filter((file) => file.ownerUserId !== userId)
      .map((file) => file.id);

    if (removableIds.length === 0) {
      return { removed: [], owned, notFound, failed: [] };
    }

    const permissions = await prisma.filePermission.findMany({
      where: {
        userId,
        fileId: { in: removableIds },
      },
      select: { fileId: true },
    });

    const removablePermissionIds = permissions.map(
      (permission) => permission.fileId,
    );
    const permissionIdSet = new Set(removablePermissionIds);
    const failed = removableIds
      .filter((id) => !permissionIdSet.has(id))
      .map((id) => ({
        id,
        reason: "Direct shared access not found",
      }));

    if (removablePermissionIds.length === 0) {
      return { removed: [], owned, notFound, failed };
    }

    await prisma.filePermission.deleteMany({
      where: {
        userId,
        fileId: { in: removablePermissionIds },
      },
    });

    await prisma.auditLog.createMany({
      data: removablePermissionIds.map((fileId) => ({
        userId,
        action: "shared_file_removed",
        fileId,
        details: `Removed direct shared access for file ${fileId}`,
      })),
    });

    return {
      removed: removablePermissionIds,
      owned,
      notFound,
      failed,
    };
  },

  async bulkDeleteFiles(
    fileIds: string[],
    folderIds: string[],
    userId: string,
    isAdmin = false,
    options: {
      selectAll?: boolean;
      sourceFolderId?: string | null;
      excludeIds?: string[];
    } = {},
  ): Promise<BulkDeleteResult> {
    const uniqueFileIds = Array.from(
      new Set(fileIds.filter((id): id is string => typeof id === "string")),
    );
    const uniqueFolderIds = Array.from(
      new Set(folderIds.filter((id): id is string => typeof id === "string")),
    );

    let resolvedFileIds = uniqueFileIds;
    let resolvedFolderIds = uniqueFolderIds;

    if (options.selectAll) {
      const [allFolders, allFiles] = await Promise.all([
        prisma.folder.findMany({
          where: {
            ownerUserId: userId,
            parentFolderId: options.sourceFolderId ?? null,
          },
          select: { id: true },
        }),
        prisma.file.findMany({
          where: {
            ownerUserId: userId,
            folderId: options.sourceFolderId ?? null,
            status: "available",
          },
          select: { id: true },
        }),
      ]);
      const excluded = new Set(options.excludeIds ?? []);
      resolvedFolderIds = allFolders
        .map((f) => f.id)
        .filter((id) => !excluded.has(id));
      resolvedFileIds = allFiles
        .map((f) => f.id)
        .filter((id) => !excluded.has(id));
    }

    if (resolvedFileIds.length === 0 && resolvedFolderIds.length === 0) {
      throw new BulkDeleteValidationError(
        "At least one file or folder ID is required",
      );
    }

    if (
      resolvedFileIds.length + resolvedFolderIds.length >
      MAX_BULK_DELETE_FILES
    ) {
      throw new BulkDeleteValidationError(
        `Cannot delete more than ${MAX_BULK_DELETE_FILES} items at once`,
      );
    }

    const [files, folders] = await Promise.all([
      resolvedFileIds.length > 0
        ? prisma.file.findMany({ where: { id: { in: resolvedFileIds } } })
        : ([] as Awaited<ReturnType<typeof prisma.file.findMany>>),
      resolvedFolderIds.length > 0
        ? prisma.folder.findMany({ where: { id: { in: resolvedFolderIds } } })
        : ([] as Awaited<ReturnType<typeof prisma.folder.findMany>>),
    ]);

    const filesById = new Map(files.map((file) => [file.id, file]));
    const notFound = resolvedFileIds.filter((id) => !filesById.has(id));
    const forbidden: string[] = [];
    const authorizedFiles: typeof files = [];

    for (const file of files) {
      if (file.ownerUserId !== userId && !isAdmin) {
        forbidden.push(file.id);
      } else {
        authorizedFiles.push(file);
      }
    }

    const folderById = new Map(folders.map((folder) => [folder.id, folder]));
    const folderNotfound = resolvedFolderIds.filter(
      (id) => !folderById.has(id),
    );
    const folderForbidden: string[] = [];
    const authorizedFolders: typeof folders = [];
    for (const folder of folders) {
      if (folder.ownerUserId !== userId && !isAdmin) {
        folderForbidden.push(folder.id);
      } else {
        authorizedFolders.push(folder);
      }
    }

    const foldersToDelete: string[] = [];
    const folderTreeFiles: typeof files = [];
    for (const folder of authorizedFolders) {
      const descendantRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        getDescendantCteSql(),
        folder.id,
      );
      const ids = descendantRows.map((r) => r.id);
      foldersToDelete.push(...ids);
      const treeFiles = await prisma.file.findMany({
        where: { folderId: { in: ids } },
      });
      folderTreeFiles.push(...treeFiles);
    }

    if (authorizedFiles.length === 0 && foldersToDelete.length === 0) {
      return {
        deleted: [],
        foldersDeleted: [],
        forbidden: [...forbidden, ...folderForbidden],
        notFound: [...notFound, ...folderNotfound],
        failed: [],
      };
    }

    const directFileIdSet = new Set(authorizedFiles.map((file) => file.id));
    const extraTreeFiles = folderTreeFiles.filter(
      (file) => !directFileIdSet.has(file.id),
    );
    const filesToDelete = [...authorizedFiles, ...extraTreeFiles];

    const failed: { id: string; reason: string }[] = [];
    const objectKeyToFileId = new Map(
      filesToDelete.map((file) => [file.objectKey, file.id]),
    );

    try {
      const { errors } = await r2Service.deleteObjects(
        filesToDelete.map((file) => file.objectKey),
      );

      for (const error of errors) {
        const fileId = objectKeyToFileId.get(error.key);
        if (fileId) {
          failed.push({ id: fileId, reason: error.message });
        }
      }
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Failed to delete R2 objects";
      return {
        deleted: [],
        foldersDeleted: [],
        forbidden: [...forbidden, ...folderForbidden],
        notFound: [...notFound, ...folderNotfound],
        failed: filesToDelete.map((file) => ({ id: file.id, reason })),
      };
    }

    const failedIds = new Set(failed.map((item) => item.id));
    const filesToDeleteDb = filesToDelete.filter(
      (file) => !failedIds.has(file.id),
    );

    if (filesToDeleteDb.length === 0 && foldersToDelete.length === 0) {
      return {
        deleted: [],
        foldersDeleted: [],
        forbidden: [...forbidden, ...folderForbidden],
        notFound: [...notFound, ...folderNotfound],
        failed,
      };
    }

    await prisma.$transaction(async (tx) => {
      const totalBytesByOwner = new Map<string, bigint>();

      for (const file of filesToDeleteDb) {
        totalBytesByOwner.set(
          file.ownerUserId,
          (totalBytesByOwner.get(file.ownerUserId) || BigInt(0)) +
            file.sizeBytes,
        );
      }

      if (filesToDeleteDb.length > 0) {
        await tx.file.deleteMany({
          where: { id: { in: filesToDeleteDb.map((file) => file.id) } },
        });
      }
      if (foldersToDelete.length > 0) {
        await tx.folder.deleteMany({
          where: { id: { in: foldersToDelete } },
        });
      }

      for (const [ownerUserId, totalBytes] of totalBytesByOwner) {
        await tx.quotaUsage.upsert({
          where: { userId: ownerUserId },
          create: {
            userId: ownerUserId,
            quotaBytes: DEFAULT_QUOTA_BYTES,
            usedBytes: BigInt(0),
          },
          update: {},
        });

        const lockedRows = await tx.$queryRawUnsafe<{ used_bytes: string }[]>(
          `SELECT used_bytes FROM quota_usage WHERE user_id = $1 FOR UPDATE`,
          ownerUserId,
        );

        if (lockedRows.length > 0) {
          const usedBytes = BigInt(lockedRows[0].used_bytes);
          const newUsed =
            usedBytes >= totalBytes ? usedBytes - totalBytes : BigInt(0);

          await tx.quotaUsage.update({
            where: { userId: ownerUserId },
            data: { usedBytes: newUsed },
          });
        }
      }

      await tx.auditLog.createMany({
        data: filesToDeleteDb.map((file) => ({
          userId,
          action: "file_deleted",
          fileId: file.id,
          details: `Permanently deleted file ${file.originalName} (${file.sizeBytes} bytes) from R2 and database via bulk delete. Action performed by ${userId}`,
        })),
      });

      if (authorizedFolders.length > 0) {
        await tx.auditLog.createMany({
          data: authorizedFolders.map((folder) => ({
            userId,
            action: "folder_deleted",
            folderId: folder.id,
            details: `Deleted folder "${folder.name}" and descendants via bulk delete. Action performed by ${userId}`,
          })),
        });
      }
    }, TRANSACTION_TIMEOUT);

    return {
      deleted: filesToDeleteDb.map((file) => file.id),
      foldersDeleted: foldersToDelete,
      forbidden: [...forbidden, ...folderForbidden],
      notFound: [...notFound, ...folderNotfound],
      failed,
    };
  },

  async cleanupExpiredUploads() {
    const now = new Date();
    const expiredSessions = await prisma.uploadSession.findMany({
      where: {
        status: { in: ["initiated", "uploading"] },
        expiresAt: { lt: now },
      },
    });

    for (const session of expiredSessions) {
      try {
        await r2Service.abortMultipartUpload(
          session.objectKey,
          session.storageUploadId,
        );
      } catch (err) {
        logger.error(
          `Failed to abort R2 upload for session ${session.id}:`,
          err,
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.uploadSession.update({
          where: { id: session.id },
          data: { status: "expired" },
        });

        await tx.file.update({
          where: { id: session.fileId },
          data: { status: "failed", deletedAt: new Date() },
        });

        await auditService.log({
          userId: session.userId,
          action: "upload_expired",
          fileId: session.fileId,
          details: `Upload session expired. Object key: ${session.objectKey}`,
        });
      });
    }

    return expiredSessions.length;
  },
};
