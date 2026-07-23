import Redis from "ioredis";
import { Logger } from "./logger";

const redisLogger = Logger.withContext("Redis");

const globalForRedis = global as unknown as {
  redis: Redis | undefined;
};

export const createRedisClient = (): Redis => {
  // Connection setup for redis is temporarily commented out
  /*
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
  */

  redisLogger.info("Redis connection setup is temporarily commented out. Returning mock client.");
  const mockPipeline = () => {
    const chain = {
      get: () => chain,
      incr: () => chain,
      expire: () => chain,
      del: () => chain,
      exec: async () => [
        [null, "0"],
        [null, "0"],
        [null, "0"]
      ]
    };
    return chain;
  };

  return {
    pipeline: mockPipeline,
    on: () => {},
  } as unknown as Redis;
};

export const redis = globalForRedis.redis || createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export default redis;
