import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import prisma from "@/app/lib/prisma";
import { logger, withLogging } from "@/app/lib/logger";

export const POST = withLogging(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const user = getRequestUser(request);

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { id } = await params;
      const body = await request.json();
      const { quotaBytes } = body;

      if (typeof quotaBytes !== "number" || quotaBytes <= 0) {
        return NextResponse.json({ error: "Invalid quota" }, { status: 400 });
      }

      const roundedQuotaBytes = Math.round(quotaBytes);

      const updated = await prisma.quotaUsage.upsert({
        where: { userId: id },
        create: {
          userId: id,
          quotaBytes: BigInt(roundedQuotaBytes),
          usedBytes: BigInt(0),
        },
        update: {
          quotaBytes: BigInt(roundedQuotaBytes),
        },
      });

      return NextResponse.json({
        success: true,
        quotaBytes: updated.quotaBytes.toString(),
      });
    } catch (error) {
      logger.error("Error updating user quota:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
