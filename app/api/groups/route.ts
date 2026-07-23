import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { groupService } from "@/app/lib/group-service";
import { withLogging } from "@/app/lib/logger";

export const GET = withLogging(async (request: Request) => {
  try {
    const user = getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await groupService.listUserGroups(user.id);
    return NextResponse.json(groups);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withLogging(async (request: Request) => {
  try {
    const user = getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 },
      );
    }

    const group = await groupService.createGroup(name, description, user.id);
    return NextResponse.json(group);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
