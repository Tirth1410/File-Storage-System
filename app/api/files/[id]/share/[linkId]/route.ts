import { NextResponse } from "next/server";
import { withLogging } from "@/app/lib/logger";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { shareService } from "@/app/lib/share-service";
import prisma from "@/app/lib/prisma";

export const DELETE = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string; linkId: string }> },
  ) => {
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id: fileId, linkId } = await params;
      const file = await prisma.file.findUnique({ where: { id: fileId } });
      if (
        !file ||
        (file.ownerUserId !== session.user.id && session.user.role !== "admin")
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await shareService.deleteShareLink(linkId);
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
);
