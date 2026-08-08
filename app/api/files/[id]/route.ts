import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { fileService } from "@/app/lib/file-service";
import { logger, withLogging } from "@/app/lib/logger";
import prisma from "@/app/lib/prisma";

export const GET = withLogging(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const user = getRequestUser(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id } = await params;
      const file = await prisma.file.findUnique({ where: { id } });
      if (!file) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      }
      if (file.ownerUserId !== user.id && user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return NextResponse.json({
        file: { ...file, sizeBytes: file.sizeBytes.toString() },
      });
    } catch {
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withLogging(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const user = getRequestUser(request);

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const context =
        searchParams.get("context") === "shared" ? "shared" : "own";
      const isAdmin = user.role === "admin";

      if (context === "shared") {
        const result = await fileService.removeSharedFileAccess(id, user.id);
        return NextResponse.json(result);
      }

      await fileService.deleteFile(id, user.id, isAdmin);

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Error deleting file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";
      const status = errorMessage === "Forbidden" ? 403 : 500;
      return NextResponse.json({ error: errorMessage }, { status });
    }
  },
);
