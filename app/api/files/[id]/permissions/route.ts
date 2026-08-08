import { NextResponse } from "next/server";
import { withLogging } from "@/app/lib/logger";
import { getRequestUser } from "@/app/lib/request-user";
import { invitationService } from "@/app/lib/invitation-service";
import { shareService } from "@/app/lib/share-service";
import prisma from "@/app/lib/prisma";

export const POST = withLogging(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const user = getRequestUser(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id: fileId } = await params;
      const body = await request.json();

      const file = await prisma.file.findUnique({ where: { id: fileId } });
      if (!file || (file.ownerUserId !== user.id && user.role !== "admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (!body.email) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 },
        );
      }

      try {
        const result = await invitationService.createFileInvite({
          fileId,
          email: body.email,
          permission: body.permission || "read",
          invitedByUserId: user.id,
        });
        return NextResponse.json(result);
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : "Failed to add permission";
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
    } catch {
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
);

export const GET = withLogging(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const user = getRequestUser(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id: fileId } = await params;
      const file = await prisma.file.findUnique({ where: { id: fileId } });
      if (!file || (file.ownerUserId !== user.id && user.role !== "admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const permissions = await shareService.listFilePermissions(fileId);
      return NextResponse.json({ permissions });
    } catch {
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
);
