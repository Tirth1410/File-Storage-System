import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { BulkDeleteValidationError, fileService } from "@/app/lib/file-service";
import { logger, withLogging } from "@/app/lib/logger";

export const POST = withLogging(async (request: Request) => {
  try {
    const user = getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const fileIds = body?.fileIds;
    const context = body?.context === "shared" ? "shared" : "own";

    if (!Array.isArray(fileIds)) {
      return NextResponse.json(
        { error: "fileIds must be an array" },
        { status: 400 },
      );
    }

    const result =
      context === "shared"
        ? await fileService.bulkRemoveSharedFileAccess(fileIds, user.id)
        : await fileService.bulkDeleteFiles(
            fileIds,
            user.id,
            user.role === "admin",
          );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BulkDeleteValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logger.error("Error bulk deleting files:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
