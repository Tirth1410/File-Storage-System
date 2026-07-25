import Redis from "ioredis";
import { Logger } from "./logger";

const redisLogger = Logger.withContext("Redis");

const globalForRedis = global as unknown as {
  redis: Redis | undefined;
};

const getRedisUrl = (): string => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    redisLogger.error("REDIS_URL environment variable is missing");
    throw new Error("REDIS_URL environment variable is required");
  }
  return redisUrl;
};

export const createRedisClient = (): Redis => {
  const redisUrl = getRedisUrl();

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true,
  });

  client.on("connect", () => {
    redisLogger.info("Successfully connected to Redis");
  });

  client.on("error", (err: Error) => {
    redisLogger.error("Redis connection error:", err.message);
  });

  return client;
};

export const redis = globalForRedis.redis || createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export default redis;
