import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { groupService } from "@/app/lib/group-service";
import { withLogging } from "@/app/lib/logger";

export const GET = withLogging(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id: fileId } = await params;
      const groups = await groupService.listFileGroups(fileId);
      return NextResponse.json({ groups });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
);

export const POST = withLogging(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id: fileId } = await params;
      const {
        groupId,
        allowPreview = true,
        allowDownload = true,
      } = await request.json();

      if (!groupId || typeof groupId !== "string") {
        return NextResponse.json(
          { error: "groupId is required" },
          { status: 400 },
        );
      }

      const shared = await groupService.shareFileWithGroup(
        fileId,
        groupId,
        allowPreview,
        allowDownload,
        session.user.id,
      );

      return NextResponse.json(shared);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status = message.includes("Forbidden")
        ? 403
        : message.includes("not found")
          ? 404
          : 400;
      return NextResponse.json({ error: message }, { status });
    }
  },
);
