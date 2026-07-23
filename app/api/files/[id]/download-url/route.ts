import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/lib/request-user";
import { r2Service } from "@/app/lib/r2";
import { auditService } from "@/app/lib/audit-service";
import { authorizationService } from "@/app/lib/authorization-service";
import { logger, withLogging } from "@/app/lib/logger";

export const GET = withLogging(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const user = getRequestUser(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const download = searchParams.get("download") !== "false"; // default to true
      const token = searchParams.get("token") || undefined;

      const access = await authorizationService.canAccessFile({
        fileId: id,
        userId: user.id,
        token,
        requiredAccess: download ? "download" : "preview",
      });

      if (!access.authorized || !access.file) {
        return NextResponse.json(
          { error: access.reason || "Forbidden" },
          { status: 403 },
        );
      }

      const file = access.file;

      if (file.status !== "available") {
        return NextResponse.json(
          { error: "File is not ready yet" },
          { status: 400 },
        );
      }

      const url = await r2Service.generatePresignedGetUrl(
        file.objectKey,
        file.originalName,
        download,
      );

      const logUserId = user.id;
      const anonymousNote = "";

      await auditService.log({
        userId: logUserId,
        action: "download_success",
        fileId: file.id,
        details: download
          ? `Requested download URL for file: ${file.originalName}${anonymousNote}`
          : `Requested preview URL for file: ${file.originalName}${anonymousNote}`,
      });

      return NextResponse.json({ url });
    } catch (error) {
      logger.error("Error generating download url:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  },
);
