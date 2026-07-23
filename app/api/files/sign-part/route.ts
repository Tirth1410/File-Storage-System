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
    const { uploadId, objectKey, partNumber } = body;

    if (!uploadId || typeof uploadId !== "string") {
      return NextResponse.json({ error: "Invalid uploadId" }, { status: 400 });
    }
    if (!objectKey || typeof objectKey !== "string") {
      return NextResponse.json({ error: "Invalid objectKey" }, { status: 400 });
    }
    if (typeof partNumber !== "number" || partNumber <= 0) {
      return NextResponse.json(
        { error: "Invalid partNumber" },
        { status: 400 },
      );
    }

    const url = await fileService.signPart(
      uploadId,
      objectKey,
      partNumber,
      user.id,
    );

    return NextResponse.json({ url });
  } catch (error) {
    logger.error("Error in sign-part:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
