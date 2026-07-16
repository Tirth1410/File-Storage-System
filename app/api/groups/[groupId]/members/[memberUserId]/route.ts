import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { groupService } from "@/app/lib/group-service";
import { withLogging } from "@/app/lib/logger";

export const PATCH = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ groupId: string; memberUserId: string }> },
  ) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { groupId, memberUserId } = await params;
      const { role } = await request.json();

      if (!role || !["ADMIN", "MEMBER"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      const result = await groupService.updateMemberRole(
        groupId,
        memberUserId,
        role,
        session.user.id,
      );
      return NextResponse.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status =
        message.includes("Forbidden") || message.includes("Only the owner")
          ? 403
          : message.includes("not found")
            ? 404
            : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
);

export const DELETE = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ groupId: string; memberUserId: string }> },
  ) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { groupId, memberUserId } = await params;
      const result = await groupService.removeMember(
        groupId,
        memberUserId,
        session.user.id,
      );
      return NextResponse.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status =
        message.includes("Forbidden") || message.includes("Owner cannot")
          ? 403
          : message.includes("not found")
            ? 404
            : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
);
