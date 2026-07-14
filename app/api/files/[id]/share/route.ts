import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { shareService } from "@/app/lib/share-service";
import prisma from "@/app/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: fileId } = await params;
    const body = await request.json();

    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (
      !file ||
      (file.ownerUserId !== session.user.id && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shareLink = await shareService.createShareLink({
      fileId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      allowDownload: body.allowDownload ?? true,
      allowPreview: body.allowPreview ?? true,
    });

    return NextResponse.json({ shareLink });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: fileId } = await params;
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (
      !file ||
      (file.ownerUserId !== session.user.id && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const links = await shareService.listShareLinks(fileId);
    return NextResponse.json({ links });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
