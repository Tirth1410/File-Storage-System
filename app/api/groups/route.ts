import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { groupService } from "@/app/lib/group-service";
import { withLogging } from "@/app/lib/logger";

export const GET = withLogging(async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await groupService.listUserGroups(session.user.id);
    return NextResponse.json(groups);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withLogging(async (request: Request) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 },
      );
    }

    const group = await groupService.createGroup(
      name,
      description,
      session.user.id,
    );
    return NextResponse.json(group);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
