import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { adminService } from "@/app/lib/admin-service";
import { logger, withLogging } from "@/app/lib/logger";

export const GET = withLogging(async (request: Request) => {
  try {
    const user = getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stats = await adminService.getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    logger.error("Error in GET /api/admin/stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
