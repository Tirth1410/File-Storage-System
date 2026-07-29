import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { folderService } from "@/app/lib/folder-service";
import { withLogging } from "@/app/lib/logger";

export const GET = withLogging(async (request: Request) => {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");

    const contents = await folderService.getFolderContents(folderId, user.id);
    return NextResponse.json(contents);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
