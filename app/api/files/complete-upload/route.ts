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
    const { uploadId, objectKey, parts } = body;

    if (!uploadId || typeof uploadId !== "string") {
      return NextResponse.json({ error: "Invalid uploadId" }, { status: 400 });
    }
    if (!objectKey || typeof objectKey !== "string") {
      return NextResponse.json({ error: "Invalid objectKey" }, { status: 400 });
    }
    if (!Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty parts list" },
        { status: 400 },
      );
    }

    for (const part of parts) {
      if (
        typeof part.partNumber !== "number" ||
        typeof part.etag !== "string" ||
        !part.etag
      ) {
        return NextResponse.json(
          { error: "Invalid parts format" },
          { status: 400 },
        );
      }
    }

    const result = await fileService.completeUpload({
      uploadId,
      objectKey,
      parts,
      userId: user.id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("Error in complete-upload:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
