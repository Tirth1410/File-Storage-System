import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { fileService } from "@/app/lib/file-service";
import { logger, withLogging } from "@/app/lib/logger";

export const DELETE = withLogging(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id } = await params;
      const isAdmin = session.user.role === "admin";

      await fileService.deleteFile(id, session.user.id, isAdmin);

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
