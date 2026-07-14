import prisma from "@/app/lib/prisma";
import crypto from "crypto";

export interface CreateShareLinkInput {
  fileId: string;
  expiresAt?: Date | null;
  allowDownload?: boolean;
  allowPreview?: boolean;
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
};
