import Redis from "ioredis";
import { env } from "./env.js";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      console.error("Redis error:", err.message);
    });

    redis.on("connect", () => {
      console.log("Redis connected");
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  try {
    await getRedis().connect();
  } catch (err) {
    console.warn("Redis connection failed, continuing without Redis:", (err as Error).message);
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export function isRedisConnected(): boolean {
  return redis?.status === "ready";
}
