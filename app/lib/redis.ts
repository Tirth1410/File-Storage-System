import Redis from "ioredis";
import { Logger } from "./logger";

const redisLogger = Logger.withContext("Redis");

const globalForRedis = global as unknown as {
  redis: Redis | undefined;
};

export const createRedisClient = (): Redis => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    connectTimeout: 5000,
    retryStrategy(times) {
      // Exponential backoff with a maximum delay of 30 seconds
      return Math.min(times * 100, 30000);
    },
  });

  client.on("error", (err) => {
    redisLogger.error("Redis client connection error:", err.message);
  });

  client.on("connect", () => {
    redisLogger.info("Successfully connected to Redis");
  });

  return client;
};

export const redis = globalForRedis.redis || createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export default redis;
