import prisma from "@/app/lib/prisma";

export const adminService = {
  async getDashboardStats() {
    // 1. Storage metrics
    const quotaUsages = await prisma.quotaUsage.findMany();
    const defaultQuota = BigInt(2 * 1024 * 1024 * 1024); // 2 GB default

    const totalUsers = await prisma.user.count();

    let totalAllocated = BigInt(0);
    let totalUsed = BigInt(0);

    for (const qu of quotaUsages) {
      totalAllocated += qu.quotaBytes;
      totalUsed += qu.usedBytes;
    }

    // Add default quotas for users without a quota_usage row
    const usersWithQuotaCount = quotaUsages.length;
    const usersWithoutQuotaCount = Math.max(
      0,
      totalUsers - usersWithQuotaCount,
    );
    totalAllocated += BigInt(usersWithoutQuotaCount) * defaultQuota;

    const totalAvailable = totalAllocated - totalUsed;
    const overallUtilization =
      totalAllocated > BigInt(0)
        ? Number((totalUsed * BigInt(100)) / totalAllocated)
        : 0;

    // 2. File metrics
    const files = await prisma.file.findMany({
      where: {
        status: { in: ["available", "deleted"] },
      },
      select: {
        status: true,
        sizeBytes: true,
      },
    });

    const totalUploadedFiles = files.length;
    const activeFiles = files.filter((f) => f.status === "available");
    const totalActiveFiles = activeFiles.length;
    const totalDeletedFiles = files.filter(
      (f) => f.status === "deleted",
    ).length;

    let totalStorageConsumed = BigInt(0);
    for (const f of activeFiles) {
      totalStorageConsumed += f.sizeBytes;
    }

    const averageFileSize =
      totalActiveFiles > 0
        ? totalStorageConsumed / BigInt(totalActiveFiles)
        : BigInt(0);

    // 3. Upload / Download metrics
    const totalUploadRequests = await prisma.uploadSession.count();
    const successfulUploads = await prisma.uploadSession.count({
      where: { status: "completed" },
    });
    const failedUploads = await prisma.uploadSession.count({
      where: { status: { in: ["failed", "aborted", "expired"] } },
    });

    const totalDownloadRequests = await prisma.auditLog.count({
      where: { action: "download_requested" },
    });
    const successfulDownloads = await prisma.auditLog.count({
      where: { action: "download_success" },
    });
    const failedDownloads = await prisma.auditLog.count({
      where: { action: "download_failed" },
    });

    // 4. User metrics
    let usersNearingLimit = 0;
    let usersExhausted = 0;

    for (const qu of quotaUsages) {
      if (qu.quotaBytes > BigInt(0)) {
        const util = Number((qu.usedBytes * BigInt(100)) / qu.quotaBytes);
        if (util >= 100) {
          usersExhausted++;
        } else if (util >= 80) {
          usersNearingLimit++;
        }
      }
    }

    // Active users: users with at least one session OR audit log in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUserSessions = await prisma.session.findMany({
      where: { expiresAt: { gte: new Date() } },
      select: { userId: true },
      distinct: ["userId"],
    });
    const activeUserLogs = await prisma.auditLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ["userId"],
    });

    const activeUserIds = new Set([
      ...activeUserSessions.map((s) => s.userId),
      ...activeUserLogs.map((l) => l.userId),
    ]);
    const activeUsers = activeUserIds.size;

    return {
      storage: {
        totalAllocated: totalAllocated.toString(),
        totalUsed: totalUsed.toString(),
        totalAvailable: totalAvailable.toString(),
        overallUtilization,
      },
      files: {
        totalUploadedFiles,
        totalActiveFiles,
        totalDeletedFiles,
        totalStorageConsumed: totalStorageConsumed.toString(),
        averageFileSize: averageFileSize.toString(),
      },
      transfers: {
        totalUploadRequests,
        successfulUploads,
        failedUploads,
        totalDownloadRequests,
        successfulDownloads,
        failedDownloads,
      },
      users: {
        totalRegistered: totalUsers,
        activeUsers,
        nearingLimit: usersNearingLimit,
        exhaustedQuota: usersExhausted,
      },
    };
  },

  async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get quota
    let quota = await prisma.quotaUsage.findUnique({
      where: { userId },
    });
    if (!quota) {
      quota = {
        userId,
        quotaBytes: BigInt(2 * 1024 * 1024 * 1024),
        usedBytes: BigInt(0),
        updatedAt: new Date(),
      };
    }

    const remainingBytes = quota.quotaBytes - quota.usedBytes;
    const utilization =
      quota.quotaBytes > BigInt(0)
        ? Number((quota.usedBytes * BigInt(100)) / quota.quotaBytes)
        : 0;

    // Files owned by user
    const files = await prisma.file.findMany({
      where: {
        ownerUserId: userId,
        status: { in: ["available", "deleted"] },
      },
      select: {
        status: true,
        sizeBytes: true,
      },
    });

    const totalUploadedFiles = files.length;
    const totalActiveFiles = files.filter(
      (f) => f.status === "available",
    ).length;
    const totalDeletedFiles = files.filter(
      (f) => f.status === "deleted",
    ).length;

    // User activity metrics
    const uploadRequests = await prisma.uploadSession.count({
      where: { userId },
    });
    const successfulUploads = await prisma.uploadSession.count({
      where: { userId, status: "completed" },
    });
    const failedUploads = await prisma.uploadSession.count({
      where: {
        userId,
        status: { in: ["failed", "aborted", "expired"] },
      },
    });

    const downloadRequests = await prisma.auditLog.count({
      where: { userId, action: "download_requested" },
    });
    const successfulDownloads = await prisma.auditLog.count({
      where: { userId, action: "download_success" },
    });
    const failedDownloads = await prisma.auditLog.count({
      where: { userId, action: "download_failed" },
    });

    // Last activity
    const latestAuditLog = await prisma.auditLog.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const lastActivity = latestAuditLog
      ? latestAuditLog.createdAt
      : user.createdAt;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        lastActivity,
      },
      storage: {
        quotaBytes: quota.quotaBytes.toString(),
        usedBytes: quota.usedBytes.toString(),
        remainingBytes: remainingBytes.toString(),
        utilization,
      },
      files: {
        totalUploadedFiles,
        totalActiveFiles,
        totalDeletedFiles,
      },
      activity: {
        uploadRequests,
        successfulUploads,
        failedUploads,
        downloadRequests,
        successfulDownloads,
        failedDownloads,
      },
    };
  },
};
