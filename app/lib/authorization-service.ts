import prisma from "@/app/lib/prisma";

export interface AccessRequest {
  fileId: string;
  userId?: string;
  token?: string; // Share link token
  requiredAccess?: "download" | "preview" | "read";
}

export const authorizationService = {
  async canAccessFile({
    fileId,
    userId,
    token,
    requiredAccess = "read",
  }: AccessRequest) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return { authorized: false, reason: "File not found" };
    }

    if (userId) {
      // Owner check
      if (file.ownerUserId === userId) {
        return { authorized: true, file };
      }

      // Admin check
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role === "admin") {
        return { authorized: true, file };
      }

      // File permission check
      const permission = await prisma.filePermission.findUnique({
        where: {
          fileId_userId: {
            fileId,
            userId,
          },
        },
      });

      if (permission) {
        return { authorized: true, file };
      }

      // Group permission check
      const groupFiles = await prisma.groupFile.findMany({
        where: {
          fileId,
          isActive: true,
          group: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
      });

      if (groupFiles.length > 0) {
        if (requiredAccess === "download") {
          const canDownload = groupFiles.some((gf) => gf.allowDownload);
          if (canDownload) return { authorized: true, file };
        } else if (requiredAccess === "preview") {
          const canPreview = groupFiles.some((gf) => gf.allowPreview);
          if (canPreview) return { authorized: true, file };
        } else {
          return { authorized: true, file };
        }
      }
    }

    // Share link check
    if (token) {
      const shareLink = await prisma.shareLink.findUnique({
        where: { token },
      });

      if (shareLink && shareLink.fileId === fileId && shareLink.isActive) {
        if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
          return { authorized: false, reason: "Share link expired" };
        }

        if (requiredAccess === "download" && !shareLink.allowDownload) {
          return {
            authorized: false,
            reason: "Download not allowed via this link",
          };
        }

        if (requiredAccess === "preview" && !shareLink.allowPreview) {
          return {
            authorized: false,
            reason: "Preview not allowed via this link",
          };
        }

        return { authorized: true, file };
      }
    }

    return { authorized: false, reason: "Forbidden" };
  },
};
