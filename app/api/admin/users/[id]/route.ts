import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { adminService } from "@/app/lib/admin-service";
import { logger, withLogging } from "@/app/lib/logger";

export const GET = withLogging(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const user = getRequestUser(request);

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { id } = await params;
      const details = await adminService.getUserDetails(id);
      return NextResponse.json(details);
    } catch (error) {
      logger.error("Error in GET /api/admin/users/[id]:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";
      const status = errorMessage === "User not found" ? 404 : 500;
      return NextResponse.json({ error: errorMessage }, { status });
    }
  },
);
