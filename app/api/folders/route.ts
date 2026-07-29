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

    const folders = await folderService.listRootFolders(user.id);
    return NextResponse.json(folders);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withLogging(async (request: Request) => {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, parentFolderId } = await request.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 },
      );
    }

    const folder = await folderService.createFolder(
      name.trim(),
      parentFolderId || null,
      user.id,
    );
    return NextResponse.json(folder);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    const status =
      message === "Forbidden"
        ? 403
        : message === "Parent folder not found"
          ? 404
          : message.includes("already exists")
            ? 409
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
