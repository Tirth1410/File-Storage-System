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
    const { filename, size, mimeType } = body;

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }
    if (typeof size !== "number" || size <= 0) {
      return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
    }
    if (!mimeType || typeof mimeType !== "string") {
      return NextResponse.json({ error: "Invalid mime type" }, { status: 400 });
    }

    try {
      const result = await fileService.initiateUpload({
        filename,
        size,
        mimeType,
        userId: user.id,
      });

      return NextResponse.json(result);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Quota exceeded")
      ) {
        return NextResponse.json(
          { error: "QuotaExceeded", message: error.message },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error) {
    logger.error("Error in initiate-upload:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
