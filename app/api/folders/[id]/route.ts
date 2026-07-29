import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { folderService } from "@/app/lib/folder-service";
import { withLogging } from "@/app/lib/logger";

export const PATCH = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const user = getRequestUser(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id } = await params;
      const { name } = await request.json();

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Folder name is required" },
          { status: 400 },
        );
      }

      const updated = await folderService.renameFolder(
        id,
        name.trim(),
        user.id,
      );
      return NextResponse.json(updated);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status =
        message === "Forbidden"
          ? 403
          : message === "Folder not found"
            ? 404
            : message.includes("already exists")
              ? 409
              : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
);

export const DELETE = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const user = getRequestUser(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id } = await params;
      const result = await folderService.deleteFolder(id, user.id);
      return NextResponse.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status =
        message === "Forbidden"
          ? 403
          : message === "Folder not found"
            ? 404
            : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
);
