import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import prisma from "@/app/lib/prisma";
import { logger, withLogging } from "@/app/lib/logger";

export const GET = withLogging(async (request: NextRequest) => {
  try {
    const user = getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Get or upsert quota
    let quota = await prisma.quotaUsage.findUnique({
      where: { userId },
    });
    if (!quota) {
      quota = await prisma.quotaUsage.create({
        data: {
          userId,
          quotaBytes: BigInt(200 * 1024 * 1024),
          usedBytes: BigInt(0),
        },
      });
    }

    const remainingBytes = quota.quotaBytes - quota.usedBytes;
    const utilization =
      quota.quotaBytes > BigInt(0)
        ? Number((quota.usedBytes * BigInt(100)) / quota.quotaBytes)
        : 0;

    // File counts
    const files = await prisma.file.findMany({
      where: { ownerUserId: userId, status: "available" },
      orderBy: { createdAt: "desc" },
    });

    const totalUploadedFiles = files.length;

    // Downloads
    const totalDownloads = await prisma.auditLog.count({
      where: { userId, action: "download_success" },
    });

    // Recent uploads
    const recentUploads = files.slice(0, 5).map((f) => ({
      id: f.id,
      originalName: f.originalName,
      sizeBytes: f.sizeBytes.toString(),
      createdAt: f.createdAt,
    }));

    // Recent downloads
    const recentDownloadsLogs = await prisma.auditLog.findMany({
      where: { userId, action: "download_success" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const recentDownloadFileIds = recentDownloadsLogs
      .map((l) => l.fileId)
      .filter(Boolean) as string[];
    const downloadFiles = await prisma.file.findMany({
      where: { id: { in: recentDownloadFileIds } },
    });

    const recentDownloads = recentDownloadsLogs.map((log) => {
      const file = downloadFiles.find((f) => f.id === log.fileId);
      return {
        id: log.id,
        fileId: log.fileId,
        originalName: file ? file.originalName : "Unknown File",
        downloadedAt: log.createdAt,
      };
    });

    return NextResponse.json({
      storage: {
        quotaBytes: quota.quotaBytes.toString(),
        usedBytes: quota.usedBytes.toString(),
        remainingBytes: remainingBytes.toString(),
        utilization,
      },
      files: {
        totalUploadedFiles,
        totalDownloads,
        recentUploads,
        recentDownloads,
      },
    });
  } catch (error) {
    logger.error("Error in profile stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
