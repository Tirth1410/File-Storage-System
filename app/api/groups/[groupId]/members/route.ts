import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { groupService } from "@/app/lib/group-service";
import { withLogging } from "@/app/lib/logger";

export const POST = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ groupId: string }> },
  ) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { groupId } = await params;
      const { email, role = "MEMBER" } = await request.json();

      if (!email || typeof email !== "string") {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 },
        );
      }

      if (!["ADMIN", "MEMBER"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      const member = await groupService.addMember(
        groupId,
        email,
        role,
        session.user.id,
      );
      return NextResponse.json(member);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status =
        message === "Forbidden"
          ? 403
          : message === "User with this email not found" ||
              message === "Group not found"
            ? 404
            : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
);
