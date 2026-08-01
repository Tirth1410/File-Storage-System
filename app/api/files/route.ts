import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import prisma from "@/app/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { logger, withLogging } from "@/app/lib/logger";

export const GET = withLogging(async (request: NextRequest) => {
  try {
    const user = getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") === "shared" ? "shared" : "own";
    const folderId = searchParams.get("folderId");

    const whereClause: Prisma.FileWhereInput = {
      status: "available",
    };

    if (type === "own") {
      whereClause.ownerUserId = user.id;
      if (searchParams.has("folderId")) {
        whereClause.folderId = folderId;
      }
    } else if (type === "shared") {
      whereClause.ownerUserId = { not: user.id };
      whereClause.permissions = { some: { userId: user.id } };
    }

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
    );
    const pageSizeRaw = searchParams.get("pageSize");
    const pageSize =
      pageSizeRaw && Number.parseInt(pageSizeRaw, 10) > 0
        ? Number.parseInt(pageSizeRaw, 10)
        : undefined;

    const [totalItems, files] = await Promise.all([
      prisma.file.count({ where: whereClause }),
      prisma.file.findMany({
        where: whereClause,
        orderBy: {
          createdAt: "desc",
        },
        ...(pageSize ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
    ]);

    const serializedFiles = files.map((file) => ({
      ...file,
      sizeBytes: file.sizeBytes.toString(),
    }));

    return NextResponse.json({
      files: serializedFiles,
      totalItems,
      page,
      pageSize: pageSize ?? null,
      totalPages: pageSize ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1,
    });
  } catch (error) {
    logger.error("Error fetching files:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
