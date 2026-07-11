import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { fileService } from "@/app/lib/file-service";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
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
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in abort-upload:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
