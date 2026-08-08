import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import prisma from "@/app/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { logger, withLogging } from "@/app/lib/logger";
import {
  FILE_CURSOR_ORDER_BY,
  computeFilePage,
  fileCursorWhere,
  parseLimit,
} from "@/app/lib/pagination";

export const GET = withLogging(async (request: NextRequest) => {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));
    const cursor = searchParams.get("cursor");

    const baseWhere: Prisma.FileWhereInput = {
      status: "available",
      ownerUserId: user.id,
      OR: [
        { shareLinks: { some: {} } },
        { permissions: { some: {} } },
        { groupFiles: { some: {} } },
        { invitations: { some: { status: "PENDING" } } },
      ],
    };

    const [totalItems, fileRows] = await Promise.all([
      prisma.file.count({ where: baseWhere }),
      prisma.file.findMany({
        where: { ...baseWhere, ...fileCursorWhere(cursor) },
        orderBy: FILE_CURSOR_ORDER_BY,
        take: limit + 1,
        include: {
          _count: {
            select: {
              shareLinks: true,
              permissions: true,
              groupFiles: true,
              invitations: true,
            },
          },
        },
      }),
    ]);

    const { items, hasMore, nextCursor } = computeFilePage(fileRows, limit);

    const files = items.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes.toString(),
      status: file.status,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
      ownerUserId: file.ownerUserId,
      linkCount: file._count.shareLinks,
      userCount: file._count.permissions,
      groupCount: file._count.groupFiles,
      inviteCount: file._count.invitations,
    }));

    return NextResponse.json({
      files,
      totalItems,
      limit,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    logger.error("Error fetching shared files:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
