import { NextResponse } from "next/server";
import { fileService } from "@/app/lib/file-service";
import { invitationService } from "@/app/lib/invitation-service";
import { logger, withLogging } from "@/app/lib/logger";

export const GET = withLogging(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanedCount = await fileService.cleanupExpiredUploads();
    const expiredInvites = await invitationService.expireStaleInvites();
    return NextResponse.json({ success: true, cleanedCount, expiredInvites });
  } catch (error) {
    logger.error("Error running cleanup job:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
});
