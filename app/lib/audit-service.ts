import prisma from "@/app/lib/prisma";

export const auditService = {
  async log({
    userId,
    action,
    fileId,
    details,
  }: {
    userId: string;
    action: string;
    fileId?: string;
    details?: string;
  }) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId,
          action,
          fileId,
          details,
        },
      });
    } catch (err) {
      console.error("Failed to write audit log:", err);
    }
  },
};
