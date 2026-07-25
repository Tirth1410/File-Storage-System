import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import { logger, withLogging } from "@/app/lib/logger";

export const GET = withLogging(async () => {
  try {
    const response = await redis.ping();
    return NextResponse.json({
      status: "success",
      message: "Redis connection working",
      ping: response,
    });
  } catch (error) {
    logger.error("Redis connection failed:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Redis connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}, "RedisTest");
