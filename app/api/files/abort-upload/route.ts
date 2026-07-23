import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { fileService } from "@/app/lib/file-service";
import { logger, withLogging } from "@/app/lib/logger";

export const POST = withLogging(async (request: Request) => {
  try {
    const user = getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { uploadId, objectKey } = body;

    if (!uploadId || typeof uploadId !== "string") {
      return NextResponse.json({ error: "Invalid uploadId" }, { status: 400 });
    }
    if (!objectKey || typeof objectKey !== "string") {
      return NextResponse.json({ error: "Invalid objectKey" }, { status: 400 });
    }

    await fileService.abortUpload({
      uploadId,
      objectKey,
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in abort-upload:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
