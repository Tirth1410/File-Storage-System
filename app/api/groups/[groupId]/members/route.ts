import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { invitationService } from "@/app/lib/invitation-service";
import { withLogging } from "@/app/lib/logger";

export const POST = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ groupId: string }> },
  ) => {
    try {
      const user = getRequestUser(request);

      if (!user) {
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

      const result = await invitationService.createGroupInvite({
        groupId,
        email,
        role,
        invitedByUserId: user.id,
      });
      return NextResponse.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status =
        message === "Forbidden"
          ? 403
          : message === "Group not found"
            ? 404
            : message === "You cannot invite yourself"
              ? 400
              : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
);
