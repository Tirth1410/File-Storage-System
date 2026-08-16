import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { folderService } from "@/app/lib/folder-service";
import { BulkOperationError } from "@/app/lib/bulk";
import { withLogging } from "@/app/lib/logger";

export const POST = withLogging(async (request: Request) => {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const fileIds = Array.isArray(body?.fileIds) ? body.fileIds : [];
    const folderIds = Array.isArray(body?.folderIds) ? body.folderIds : [];
    const targetFolderId =
      typeof body?.targetFolderId === "string" ? body.targetFolderId : null;
    const selectAll = body?.selectAll === true;
    const sourceFolderId =
      typeof body?.folderId === "string" ? body.folderId : null;
    const excludeIds = Array.isArray(body?.excludeIds) ? body.excludeIds : [];

    if (fileIds.length === 0 && folderIds.length === 0 && !selectAll) {
      return NextResponse.json(
        { error: "At least one file or folder is required" },
        { status: 400 },
      );
    }

    const result = await folderService.bulkMove({
      fileIds,
      folderIds,
      targetFolderId,
      selectAll,
      sourceFolderId,
      excludeIds,
      userId: user.id,
      isAdmin: user.role === "admin",
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BulkOperationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    const status =
      message === "Forbidden"
        ? 403
        : message === "Target folder not found"
          ? 404
          : message.includes("already exists")
            ? 409
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
