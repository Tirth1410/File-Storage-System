import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { folderService } from "@/app/lib/folder-service";
import { withLogging } from "@/app/lib/logger";

export const GET = withLogging(
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
      const breadcrumb = await folderService.getBreadcrumb(id, user.id);
      return NextResponse.json(breadcrumb);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status =
        message === "Forbidden"
          ? 403
          : message === "Folder not found"
            ? 404
            : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
);
