import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { logger, withLogging } from "@/app/lib/logger";

export const GET = withLogging(async (request: NextRequest) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const whereClause: Prisma.FileWhereInput = {
      status: "available",
    };

    if (type === "own") {
      whereClause.ownerUserId = session.user.id;
    } else if (type === "shared") {
      whereClause.ownerUserId = { not: session.user.id };
      whereClause.OR = [
        { permissions: { some: { userId: session.user.id } } },
        {
          groupFiles: {
            some: {
              isActive: true,
              group: {
                members: {
                  some: {
                    userId: session.user.id,
                  },
                },
              },
            },
          },
        },
      ];
    } else {
      // Default: fetch both owned and shared files
      whereClause.OR = [
        { ownerUserId: session.user.id },
        { permissions: { some: { userId: session.user.id } } },
        {
          groupFiles: {
            some: {
              isActive: true,
              group: {
                members: {
                  some: {
                    userId: session.user.id,
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
