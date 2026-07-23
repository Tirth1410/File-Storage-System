import { NextResponse } from "next/server";
import { withLogging } from "@/app/lib/logger";
import { getRequestUser } from "@/app/lib/request-user";
import { shareService } from "@/app/lib/share-service";
import prisma from "@/app/lib/prisma";

export const DELETE = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string; userId: string }> },
  ) => {
    try {
      const user = getRequestUser(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id: fileId, userId } = await params;
      const file = await prisma.file.findUnique({ where: { id: fileId } });
      if (!file || (file.ownerUserId !== user.id && user.role !== "admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await shareService.removeFilePermission(fileId, userId);
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
);
