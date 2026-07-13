import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { r2Service } from "@/app/lib/r2";
import { auditService } from "@/app/lib/audit-service";

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

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") !== "false"; // default to true

    const file = await prisma.file.findUnique({
      where: {
        id,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Permission check: only owner can access
    if (file.ownerUserId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    await auditService.log({
      userId: session.user.id,
      action: "download_success",
      fileId: file.id,
      details: download
        ? `Requested download URL for file: ${file.originalName}`
        : `Requested preview URL for file: ${file.originalName}`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error generating download url:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
