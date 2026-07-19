import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { r2Service } from "@/app/lib/r2";
import { auditService } from "@/app/lib/audit-service";
import { authorizationService } from "@/app/lib/authorization-service";
import { auth } from "@/app/lib/auth";
import { headers } from "next/headers";
import { logger, withLogging } from "@/app/lib/logger";

export const GET = withLogging(
  async (
    request: Request,
    { params }: { params: Promise<{ token: string }> },
  ) => {
    try {
      const { token } = await params;

      const shareLink = await prisma.shareLink.findUnique({
        where: { token },
        include: { file: true },
      });

      if (!shareLink) {
        return NextResponse.json(
          { error: "Invalid share link" },
          { status: 404 },
        );
      }

      const session = await auth.api.getSession({ headers: await headers() });

      const access = await authorizationService.canAccessFile({
        fileId: shareLink.fileId,
        userId: session?.user?.id,
        token,
        requiredAccess: "read",
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

      let previewUrl: string | null = null;
      let downloadUrl: string | null = null;

      if (shareLink.allowPreview) {
        previewUrl = await r2Service.generatePresignedGetUrl(
          file.objectKey,
          file.originalName,
          false, // preview
        );
      }

      if (shareLink.allowDownload) {
        downloadUrl = await r2Service.generatePresignedGetUrl(
          file.objectKey,
          file.originalName,
          true, // download
        );
      }

      const logUserId = session?.user?.id || file.ownerUserId;
      const anonymousNote = !session?.user?.id ? " (via share link)" : "";

      await auditService.log({
        userId: logUserId,
        action: "download_success",
        fileId: file.id,
        details: `Accessed share link for file: ${file.originalName}${anonymousNote}`,
      });

      return NextResponse.json({
        file: {
          id: file.id,
          originalName: file.originalName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes.toString(),
        },
        previewUrl,
        downloadUrl,
        allowPreview: shareLink.allowPreview,
        allowDownload: shareLink.allowDownload,
      });
    } catch (error) {
      logger.error("Error resolving share link:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
