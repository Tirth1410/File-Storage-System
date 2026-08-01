import prisma from "@/app/lib/prisma";

export const DEFAULT_QUOTA_BYTES = 200 * 1024 * 1024; // 200 MB default

export const adminService = {
  async listUsers(limit = 100) {
    const users = await prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { quotaUsage: true },
    });

    return users.map((user) => {
      const quota = user.quotaUsage;
      const quotaBytes = quota?.quotaBytes ?? BigInt(DEFAULT_QUOTA_BYTES);
      const usedBytes = quota?.usedBytes ?? BigInt(0);
      const remainingBytes = quotaBytes - usedBytes;
      const utilization =
        quotaBytes > BigInt(0)
          ? Number((usedBytes * BigInt(100)) / quotaBytes)
          : 0;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        createdAt: user.createdAt,
        storage: {
          quotaBytes: quotaBytes.toString(),
          usedBytes: usedBytes.toString(),
          remainingBytes: remainingBytes.toString(),
          utilization,
        },
      };
    });
  },

  async getDashboardStats() {
    const defaultQuota = BigInt(DEFAULT_QUOTA_BYTES);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      quotaUsages,
      totalUsers,
      fileGroups,
      uploadCounts,
      downloadCounts,
      activeUserSessions,
      activeUserLogs,
    ] = await Promise.all([
      // 1. Storage metrics
      prisma.quotaUsage.findMany(),
      prisma.user.count(),
      // 2. File metrics (aggregated in DB instead of loading all rows)
      prisma.file.groupBy({
        by: ["status"],
        where: { status: { in: ["available", "deleted"] } },
        _count: { _all: true },
        _sum: { sizeBytes: true },
      }),
      // 3. Upload metrics
      Promise.all([
        prisma.uploadSession.count(),
        prisma.uploadSession.count({ where: { status: "completed" } }),
        prisma.uploadSession.count({
          where: { status: { in: ["failed", "aborted", "expired"] } },
        }),
      ]),
      // 3. Download metrics
      Promise.all([
        prisma.auditLog.count({ where: { action: "download_requested" } }),
        prisma.auditLog.count({ where: { action: "download_success" } }),
        prisma.auditLog.count({ where: { action: "download_failed" } }),
      ]),
      // 4. Active users: users with a live session OR audit log in the last 30 days
      prisma.session.findMany({
        where: { expiresAt: { gte: new Date() } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.auditLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

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

    const byStatus = new Map(fileGroups.map((group) => [group.status, group]));
    const availableGroup = byStatus.get("available");
    const deletedGroup = byStatus.get("deleted");

    const totalActiveFiles = availableGroup?._count._all ?? 0;
    const totalDeletedFiles = deletedGroup?._count._all ?? 0;
    const totalUploadedFiles = totalActiveFiles + totalDeletedFiles;
    const totalStorageConsumed = availableGroup?._sum.sizeBytes ?? BigInt(0);
    const averageFileSize =
      totalActiveFiles > 0
        ? totalStorageConsumed / BigInt(totalActiveFiles)
        : BigInt(0);

    const [totalUploadRequests, successfulUploads, failedUploads] =
      uploadCounts;
    const [totalDownloadRequests, successfulDownloads, failedDownloads] =
      downloadCounts;

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
    const [
      user,
      quotaRow,
      fileGroups,
      uploadCounts,
      downloadCounts,
      latestAuditLog,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.quotaUsage.findUnique({ where: { userId } }),
      prisma.file.groupBy({
        by: ["status"],
        where: {
          ownerUserId: userId,
          status: { in: ["available", "deleted"] },
        },
        _count: { _all: true },
      }),
      Promise.all([
        prisma.uploadSession.count({ where: { userId } }),
        prisma.uploadSession.count({
          where: { userId, status: "completed" },
        }),
        prisma.uploadSession.count({
          where: {
            userId,
            status: { in: ["failed", "aborted", "expired"] },
          },
        }),
      ]),
      Promise.all([
        prisma.auditLog.count({
          where: { userId, action: "download_requested" },
        }),
        prisma.auditLog.count({
          where: { userId, action: "download_success" },
        }),
        prisma.auditLog.count({
          where: { userId, action: "download_failed" },
        }),
      ]),
      prisma.auditLog.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    // Get quota (default 200 MB when no quota_usage row exists)
    const quota = quotaRow ?? {
      userId,
      quotaBytes: BigInt(DEFAULT_QUOTA_BYTES),
      usedBytes: BigInt(0),
      updatedAt: new Date(),
    };

    const remainingBytes = quota.quotaBytes - quota.usedBytes;
    const utilization =
      quota.quotaBytes > BigInt(0)
        ? Number((quota.usedBytes * BigInt(100)) / quota.quotaBytes)
        : 0;

    const byStatus = new Map(fileGroups.map((group) => [group.status, group]));
    const totalActiveFiles = byStatus.get("available")?._count._all ?? 0;
    const totalDeletedFiles = byStatus.get("deleted")?._count._all ?? 0;
    const totalUploadedFiles = totalActiveFiles + totalDeletedFiles;

    const [uploadRequests, successfulUploads, failedUploads] = uploadCounts;
    const [downloadRequests, successfulDownloads, failedDownloads] =
      downloadCounts;

    // Last activity
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
