import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { shareService } from "@/app/lib/share-service";
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
    const email = typeof body?.email === "string" ? body.email : "";
    const permission = body?.permission === "write" ? "write" : "read";
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
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const result = await shareService.bulkShareWithUser({
      fileIds,
      email,
      permission,
      selectAll,
      folderId,
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
        : message === "You cannot share with yourself"
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
