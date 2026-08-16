import prisma from "@/app/lib/prisma";
import crypto from "crypto";
import { invitationService } from "@/app/lib/invitation-service";
import {
  BULK_TRANSACTION_TIMEOUT,
  buildFilePermissionUpsertSql,
  validateItemCount,
} from "@/app/lib/bulk";

export interface CreateShareLinkInput {
  fileId: string;
  expiresAt?: Date | null;
  allowDownload?: boolean;
  allowPreview?: boolean;
}

export interface BulkShareEntry {
  fileId: string;
  reason?: string;
  permission?: string;
  emailSent?: boolean;
  inviteId?: string | null;
}

export interface BulkShareWithUserResult {
  shared: BulkShareEntry[];
  invites: BulkShareEntry[];
  skipped: BulkShareEntry[];
  notFound: BulkShareEntry[];
  forbidden: BulkShareEntry[];
}

export const shareService = {
  async createShareLink({
    fileId,
    expiresAt,
    allowDownload = true,
    allowPreview = true,
  }: CreateShareLinkInput) {
    const token = crypto.randomBytes(32).toString("hex");

    const shareLink = await prisma.shareLink.create({
      data: {
        fileId,
        token,
        expiresAt,
        allowDownload,
        allowPreview,
      },
    });

    return shareLink;
  },

  async listShareLinks(fileId: string) {
    return await prisma.shareLink.findMany({
      where: { fileId },
      orderBy: { createdAt: "desc" },
    });
  },

  async deleteShareLink(id: string) {
    return await prisma.shareLink.delete({
      where: { id },
    });
  },

  async updateShareLinkStatus(id: string, isActive: boolean) {
    return await prisma.shareLink.update({
      where: { id },
      data: { isActive },
    });
  },

  async addFilePermission(
    fileId: string,
    email: string,
    permission: string = "read",
  ) {
    // Resolve email -> userId
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User with this email not found");
    }

    return await prisma.filePermission.upsert({
      where: {
        fileId_userId: {
          fileId,
          userId: user.id,
        },
      },
      update: {
        permission,
      },
      create: {
        fileId,
        userId: user.id,
        permission,
      },
    });
  },

  async removeFilePermission(fileId: string, userId: string) {
    return await prisma.filePermission.delete({
      where: {
        fileId_userId: {
          fileId,
          userId,
        },
      },
    });
  },

  async listFilePermissions(fileId: string) {
    return await prisma.filePermission.findMany({
      where: { fileId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
  },

  async bulkShareWithUser({
    fileIds = [],
    email,
    permission = "read",
    selectAll = false,
    folderId = null,
    excludeIds = [],
    userId,
    isAdmin = false,
  }: {
    fileIds?: string[];
    email: string;
    permission?: "read" | "write";
    selectAll?: boolean;
    folderId?: string | null;
    excludeIds?: string[];
    userId: string;
    isAdmin?: boolean;
  }): Promise<BulkShareWithUserResult> {
    let ids = Array.from(new Set(fileIds.filter(Boolean)));
    const safePermission: "read" | "write" =
      permission === "write" ? "write" : "read";
    const normalizedEmail = email.trim().toLowerCase();

    if (selectAll) {
      const excluded = new Set(excludeIds);
      const allFiles = await prisma.file.findMany({
        where: {
          ownerUserId: userId,
          folderId: folderId ?? null,
          status: "available",
        },
        select: { id: true },
      });
      ids = allFiles.map((f) => f.id).filter((id) => !excluded.has(id));
    }

    validateItemCount(ids.length, "share");

    const caller = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (caller?.email?.toLowerCase() === normalizedEmail) {
      throw new Error("You cannot share with yourself");
    }

    const files =
      ids.length > 0
        ? await prisma.file.findMany({ where: { id: { in: ids } } })
        : [];
    const fileById = new Map(files.map((f) => [f.id, f]));

    const recipient = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const shared: BulkShareEntry[] = [];
    const skipped: BulkShareEntry[] = [];
    const notFound: BulkShareEntry[] = [];
    const forbidden: BulkShareEntry[] = [];

    for (const id of ids) {
      const file = fileById.get(id);
      if (!file) {
        notFound.push({ fileId: id });
        continue;
      }
      if (file.ownerUserId !== userId && !isAdmin) {
        forbidden.push({ fileId: id });
        continue;
      }
      if (file.status !== "available") {
        skipped.push({ fileId: id, reason: "not available" });
        continue;
      }
      if (recipient && file.ownerUserId === recipient.id) {
        skipped.push({ fileId: id, reason: "owned by recipient" });
        continue;
      }
      shared.push({ fileId: id, permission: safePermission });
    }

    if (recipient) {
      if (shared.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.$executeRaw(
            buildFilePermissionUpsertSql(
              shared.map((s) => ({
                fileId: s.fileId,
                userId: recipient.id,
                permission: safePermission,
              })),
            ),
          );
          await tx.auditLog.createMany({
            data: shared.map((s) => ({
              userId,
              action: "file_shared",
              fileId: s.fileId,
              details: `Shared file "${fileById.get(s.fileId)!.originalName}" with ${normalizedEmail} at ${safePermission} via bulk share`,
            })),
          });
        }, BULK_TRANSACTION_TIMEOUT);
      }
      return { shared, invites: [], skipped, notFound, forbidden };
    }

    const { invited } = await invitationService.createBulkFileInvites({
      fileIds: shared.map((s) => s.fileId),
      email: normalizedEmail,
      permission: safePermission,
      invitedByUserId: userId,
    });
    const invites: BulkShareEntry[] = invited.map((i) => ({
      fileId: i.fileId,
      emailSent: i.emailSent,
      inviteId: i.inviteId,
    }));

    return { shared: [], invites, skipped, notFound, forbidden };
  },
};
