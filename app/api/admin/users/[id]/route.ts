import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { adminService } from "@/app/lib/admin-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const details = await adminService.getUserDetails(id);
    return NextResponse.json(details);
  } catch (error) {
    console.error("Error in GET /api/admin/users/[id]:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    const status = errorMessage === "User not found" ? 404 : 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
