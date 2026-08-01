import prisma from "@/app/lib/prisma";
import { logger } from "@/app/lib/logger";

export const auditService = {
  async log({
    userId,
    action,
    fileId,
    folderId,
    details,
  }: {
    userId: string;
    action: string;
    fileId?: string;
    folderId?: string;
    details?: string;
  }) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId,
          action,
          fileId,
          folderId,
          details,
        },
      });
    } catch (err) {
      logger.error("Failed to write audit log:", err);
    }
  },
};
