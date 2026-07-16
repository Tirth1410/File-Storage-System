import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { groupService } from "@/app/lib/group-service";
import { withLogging } from "@/app/lib/logger";

export const PATCH = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string; groupId: string }> },
  ) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id: fileId, groupId } = await params;
      const { allowPreview, allowDownload, isActive } = await request.json();

      const result = await groupService.updateGroupFilePermissions(
        fileId,
        groupId,
        allowPreview,
        allowDownload,
        isActive,
        session.user.id,
      );

      return NextResponse.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status = message.includes("Forbidden") ? 403 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  },
);

export const DELETE = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string; groupId: string }> },
  ) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id: fileId, groupId } = await params;
      const result = await groupService.unshareFileFromGroup(
        fileId,
        groupId,
        session.user.id,
      );
      return NextResponse.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status = message.includes("Forbidden") ? 403 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  },
);
