import prisma from "@/app/lib/prisma";
import { r2Service } from "@/app/lib/r2";
import { auditService } from "@/app/lib/audit-service";
import { logger } from "@/app/lib/logger";

export interface InitiateUploadInput {
  filename: string;
  size: number;
  mimeType: string;
  userId: string;
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

const PART_SIZE_BYTES = 8 * 1024 * 1024; // 8MB default chunk size
const DEFAULT_QUOTA_BYTES = BigInt(2 * 1024 * 1024 * 1024); // 2 GB

export const fileService = {
  async initiateUpload({
    filename,
    size,
    mimeType,
    userId,
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
      return await prisma.$transaction(async (tx) => {
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

        // 6. Write audit log
        await auditService.log({
          userId,
          action: "upload_initiated",
          fileId: file.id,
          details: `Initiated upload of file ${filename} (${size} bytes)`,
        });

        return {
          uploadId: uploadSession.storageUploadId,
          objectKey: uploadSession.objectKey,
          fileId: file.id,
          partSizeBytes: PART_SIZE_BYTES,
        };
      });
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
    });

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
    });
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
    });
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
