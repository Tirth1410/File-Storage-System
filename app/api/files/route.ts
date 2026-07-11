import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = await prisma.file.findMany({
      where: {
        ownerUserId: session.user.id,
        status: "available",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const serializedFiles = files.map((file) => ({
      ...file,
      sizeBytes: file.sizeBytes.toString(),
    }));

    return NextResponse.json(serializedFiles);
  } catch (error) {
    console.error("Error fetching files:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
