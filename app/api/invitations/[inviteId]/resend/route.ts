import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { invitationService } from "@/app/lib/invitation-service";
import { withLogging } from "@/app/lib/logger";

export const POST = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ inviteId: string }> },
  ) => {
    try {
      const user = getRequestUser(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { inviteId } = await params;
      const result = await invitationService.resendInvite({
        inviteId,
        userId: user.id,
      });
      return NextResponse.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status =
        message === "Forbidden"
          ? 403
          : message === "Invitation not found"
            ? 404
            : 400;
      return NextResponse.json({ error: message }, { status });
    }
  },
);
