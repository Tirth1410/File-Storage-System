import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { folderService } from "@/app/lib/folder-service";
import { withLogging } from "@/app/lib/logger";

export const POST = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const user = getRequestUser(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id } = await params;
      const { newParentFolderId } = await request.json();

      const updated = await folderService.moveFolder(
        id,
        newParentFolderId || null,
        user.id,
      );
      return NextResponse.json(updated);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status =
        message === "Forbidden"
          ? 403
          : message === "Folder not found" || message === "Target folder not found"
            ? 404
            : message.includes("already exists")
              ? 409
              : message.includes("descendants")
                ? 400
                : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
);
