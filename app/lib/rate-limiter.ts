import { redis } from "./redis";
import { Logger } from "./logger";

const logger = Logger.withContext("RateLimiterService");

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  remainingAttempts: number;
  resetInSeconds: number;
}

export class RateLimiterService {
  private keyPrefix: string;

  constructor(keyPrefix: string = "ratelimit") {
    this.keyPrefix = keyPrefix;
  }

  private formatKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  private getWindowInfo(windowSeconds: number) {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const currentWindowIndex = Math.floor(now / windowMs);
    const previousWindowIndex = currentWindowIndex - 1;

    const timeIntoCurrentWindow = now % windowMs;
    const previousWindowWeight = (windowMs - timeIntoCurrentWindow) / windowMs;
    const resetInSeconds = Math.max(
      1,
      Math.ceil((windowMs - timeIntoCurrentWindow) / 1000),
    );

    return {
      now,
      windowMs,
      currentWindowIndex,
      previousWindowIndex,
      previousWindowWeight,
      resetInSeconds,
    };
  }

  /**
   * Checks whether the given key is currently within rate limits using the Sliding Window Counter algorithm.
   * Calculates a weighted sum of the previous window counter and the current window counter.
   * Does NOT increment the counter.
   */
  async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const fullKey = this.formatKey(key);
    const {
      currentWindowIndex,
      previousWindowIndex,
      previousWindowWeight,
      resetInSeconds,
    } = this.getWindowInfo(windowSeconds);

    const currentKey = `${fullKey}:${currentWindowIndex}`;
    const previousKey = `${fullKey}:${previousWindowIndex}`;

    try {
      const pipeline = redis.pipeline();
      pipeline.get(currentKey);
      pipeline.get(previousKey);

      const results = await pipeline.exec();

      if (!results) {
        throw new Error("Redis pipeline returned null");
      }

      const currentCount = parseInt((results[0][1] as string) || "0", 10);
      const previousCount = parseInt((results[1][1] as string) || "0", 10);

      // Sliding Window Counter algorithm: weighted calculation
      const estimatedCount = Math.floor(
        previousCount * previousWindowWeight + currentCount,
      );

      const allowed = estimatedCount < limit;
      const remainingAttempts = Math.max(0, limit - estimatedCount);

      return {
        allowed,
        currentCount: estimatedCount,
        remainingAttempts,
        resetInSeconds,
      };
    } catch (error) {
      logger.error(
        `Failed to check rate limit for key "${fullKey}". Failing open.`,
        error,
      );
      // Fail open if Redis is unavailable
      return {
        allowed: true,
        currentCount: 0,
        remainingAttempts: limit,
        resetInSeconds: windowSeconds,
      };
    }
  }

  /**
   * Increments the failure counter for the current window and sets TTL to 2 * windowSeconds.
   */
  async increment(key: string, windowSeconds: number): Promise<number> {
    const fullKey = this.formatKey(key);
    const { currentWindowIndex, previousWindowIndex, previousWindowWeight } =
      this.getWindowInfo(windowSeconds);

    const currentKey = `${fullKey}:${currentWindowIndex}`;
    const previousKey = `${fullKey}:${previousWindowIndex}`;
    const ttlSeconds = windowSeconds * 2;

    try {
      const pipeline = redis.pipeline();
      pipeline.incr(currentKey);
      pipeline.expire(currentKey, ttlSeconds);
      pipeline.get(previousKey);

      const results = await pipeline.exec();

      if (!results) {
        throw new Error("Redis pipeline returned null");
      }

      const currentCount = (results[0][1] as number) || 1;
      const previousCount = parseInt((results[2][1] as string) || "0", 10);

      const estimatedCount = Math.floor(
        previousCount * previousWindowWeight + currentCount,
      );

      return estimatedCount;
    } catch (error) {
      logger.error(
        `Failed to increment rate limit counter for key "${fullKey}".`,
        error,
      );
      return 1;
    }
  }

  /**
   * Resets (clears) the failure counters for the key across windows.
   */
  async reset(key: string, windowSeconds: number = 900): Promise<void> {
    const fullKey = this.formatKey(key);
    const { currentWindowIndex, previousWindowIndex } =
      this.getWindowInfo(windowSeconds);

    const currentKey = `${fullKey}:${currentWindowIndex}`;
    const previousKey = `${fullKey}:${previousWindowIndex}`;

    try {
      const pipeline = redis.pipeline();
      pipeline.del(currentKey);
      pipeline.del(previousKey);
      await pipeline.exec();
    } catch (error) {
      logger.error(
        `Failed to reset rate limit counter for key "${fullKey}".`,
        error,
      );
    }
  }
}

export const genericRateLimiter = new RateLimiterService();
