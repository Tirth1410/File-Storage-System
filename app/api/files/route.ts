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
    const type = searchParams.get("type") === "shared" ? "shared" : "own";
    const folderId = searchParams.get("folderId");
    const limit = parseLimit(searchParams.get("limit"));
    const cursor = searchParams.get("cursor");

    const baseWhere: Prisma.FileWhereInput = {
      status: "available",
    };

    if (type === "own") {
      baseWhere.ownerUserId = user.id;
      if (searchParams.has("folderId")) {
        baseWhere.folderId = folderId;
      }
    } else if (type === "shared") {
      baseWhere.ownerUserId = { not: user.id };
      baseWhere.permissions = { some: { userId: user.id } };
    }

    const [totalItems, fileRows] = await Promise.all([
      prisma.file.count({ where: baseWhere }),
      prisma.file.findMany({
        where: {
          ...baseWhere,
          ...fileCursorWhere(cursor),
        },
        orderBy: FILE_CURSOR_ORDER_BY,
        take: limit + 1,
      }),
    ]);

    const {
      items: pagedFiles,
      hasMore,
      nextCursor,
    } = computeFilePage(fileRows, limit);

    const serializedFiles = pagedFiles.map((file) => ({
      ...file,
      sizeBytes: file.sizeBytes.toString(),
    }));

    return NextResponse.json({
      files: serializedFiles,
      totalItems,
      limit,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    logger.error("Error fetching files:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
