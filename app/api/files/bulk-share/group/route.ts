import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { groupService } from "@/app/lib/group-service";
import { BulkOperationError } from "@/app/lib/bulk";
import { withLogging } from "@/app/lib/logger";

export const POST = withLogging(async (request: Request) => {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const fileIds = Array.isArray(body?.fileIds)
      ? body.fileIds.filter((id: unknown) => typeof id === "string")
      : [];
    const groupId = typeof body?.groupId === "string" ? body.groupId : "";
    const allowPreview = body?.allowPreview !== false;
    const allowDownload = body?.allowDownload !== false;
    const selectAll = body?.selectAll === true;
    const folderId = typeof body?.folderId === "string" ? body.folderId : null;
    const excludeIds = Array.isArray(body?.excludeIds)
      ? body.excludeIds.filter((id: unknown) => typeof id === "string")
      : [];

    if (fileIds.length === 0 && !selectAll) {
      return NextResponse.json(
        { error: "At least one file is required" },
        { status: 400 },
      );
    }
    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 },
      );
    }

    const result = await groupService.bulkShareWithGroup({
      fileIds,
      groupId,
      allowPreview,
      allowDownload,
      selectAll,
      folderId,
      excludeIds,
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BulkOperationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    const status =
      message === "Forbidden" || message.includes("must be a member")
        ? 403
        : message === "Group not found"
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
