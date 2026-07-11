import prisma from "@/app/lib/prisma";
import { r2Service } from "@/app/lib/r2";

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

export const fileService = {
  async initiateUpload({
    filename,
    size,
    mimeType,
    userId,
  }: InitiateUploadInput) {
    // 1. Generate a unique object key in R2
    const fileId = crypto.randomUUID();
    const fileExtension = filename.split(".").pop();
    const objectKey = `${userId}/${fileId}${fileExtension ? `.${fileExtension}` : ""}`;

    // 2. Create the file record in DB with status "uploading"
    const file = await prisma.file.create({
      data: {
        id: fileId,
        ownerUserId: userId,
        bucket: process.env.R2_BUCKET!,
        objectKey,
        originalName: filename,
        mimeType,
        sizeBytes: BigInt(size),
        status: "uploading",
        visibility: "private",
      },
    });

    // 3. Initiate multipart upload on R2
    const { uploadId } = await r2Service.initializeMultipartUpload(
      objectKey,
      mimeType,
    );

    // 4. Create the upload session record in DB
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const uploadSession = await prisma.uploadSession.create({
      data: {
        fileId: file.id,
        userId,
        storageUploadId: uploadId,
        objectKey,
        sizeBytes: BigInt(size),
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

    // Update upload session and file records in DB
    await prisma.$transaction([
      prisma.uploadSession.update({
        where: { id: uploadSession.id },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      }),
      prisma.file.update({
        where: { id: uploadSession.fileId },
        data: {
          status: "available",
        },
      }),
    ]);

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
    await prisma.$transaction([
      prisma.uploadSession.update({
        where: { id: uploadSession.id },
        data: {
          status: "aborted",
        },
      }),
      prisma.file.update({
        where: { id: uploadSession.fileId },
        data: {
          status: "failed",
          deletedAt: new Date(),
        },
      }),
    ]);
  },
};
