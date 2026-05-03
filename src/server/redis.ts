/**
 * Singleton ioredis client for the trading kill-switch + future alphas:active
 * subscriptions.
 *
 * In Next.js dev, the module is HMR-reloaded; we cache on globalThis to
 * survive reloads. In production (single Node process), this is a single
 * connection per container instance.
 */
import Redis from "ioredis";

import { env } from "~/env";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    // We mostly do short bursts (XADD + GET); ioredis pools over the same TCP
    // connection. No special config needed.
  });

if (env.NODE_ENV !== "production") globalForRedis.redis = redis;
