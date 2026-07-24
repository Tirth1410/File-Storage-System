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

    const whereClause: Prisma.FileWhereInput = {
      status: "available",
    };

    if (type === "own") {
      whereClause.ownerUserId = user.id;
    } else if (type === "shared") {
      whereClause.ownerUserId = { not: user.id };
      whereClause.OR = [
        { permissions: { some: { userId: user.id } } },
        {
          groupFiles: {
            some: {
              isActive: true,
              group: {
                members: {
                  some: {
                    userId: user.id,
                  },
                },
              },
            },
          },
        },
      ];
    }

    const files = await prisma.file.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    const serializedFiles = files.map((file) => ({
      ...file,
      sizeBytes: file.sizeBytes.toString(),
    }));

    return NextResponse.json(serializedFiles);
  } catch (error) {
    logger.error("Error fetching files:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
