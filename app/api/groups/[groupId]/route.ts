import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { groupService } from "@/app/lib/group-service";
import { withLogging } from "@/app/lib/logger";

export const GET = withLogging(
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
      const group = await groupService.getGroupDetails(groupId, user.id);

      const serializedGroup = {
        ...group,
        groupFiles: group.groupFiles.map((gf) => ({
          ...gf,
          file: {
            ...gf.file,
            sizeBytes: gf.file.sizeBytes.toString(),
          },
        })),
      };

      return NextResponse.json(serializedGroup);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status =
        message === "Forbidden"
          ? 403
          : message === "Group not found"
            ? 404
            : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
);

export const PATCH = withLogging(
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
      const { name, description } = await request.json();

      if (!name || typeof name !== "string") {
        return NextResponse.json(
          { error: "Group name is required" },
          { status: 400 },
        );
      }

      const updated = await groupService.updateGroup(
        groupId,
        name,
        description,
        user.id,
      );
      return NextResponse.json(updated);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status = message === "Forbidden" ? 403 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
);

export const DELETE = withLogging(
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
      const result = await groupService.deleteGroup(groupId, user.id);
      return NextResponse.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      const status =
        message === "Forbidden"
          ? 403
          : message === "Group not found"
            ? 404
            : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
);
