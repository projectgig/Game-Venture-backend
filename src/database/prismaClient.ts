import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import pRetry, { AbortError } from "p-retry";
import Redis from "ioredis";
import { env } from "@game/core/common/config/env";

const config = {
  redis: {
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  },
  cache: {
    defaultTTL: parseInt(process.env.CACHE_TTL || "300"),
    maxMemoryEntries: parseInt(process.env.MAX_CACHE_ENTRIES || "1000"),
  },
  database: {
    maxRetries: parseInt(process.env.DB_MAX_RETRIES || "3"),
    baseDelay: parseInt(process.env.DB_BASE_DELAY || "100"),
    maxDelay: parseInt(process.env.DB_MAX_DELAY || "2000"),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || "10000"),
  },
  monitoring: {
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || "1000"),
  },
};

let redis: Redis | null = null;
try {
  redis = new Redis(config.redis);
  redis.on("error", (err) => console.error("Redis error:", err));
} catch (error) {
  console.warn("Redis not available, falling back to memory cache");
}

class LRUCache {
  private cache = new Map<
    string,
    { data: any; timestamp: number; hits: number }
  >();
  private maxSize: number;

  constructor(maxSize: number = config.cache.maxMemoryEntries) {
    this.maxSize = maxSize;
  }

  set(key: string, data: any, ttl: number = config.cache.defaultTTL): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey as string);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  get(key: string, ttl: number = config.cache.defaultTTL): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        hits: value.hits,
        age: Date.now() - value.timestamp,
      })),
    };
  }
}

const memoryCache = new LRUCache();

class MetricsCollector {
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    dbQueries: 0,
    retries: 0,
    slowQueries: 0,
    errors: 0,
  };

  increment(metric: keyof typeof this.metrics): void {
    this.metrics[metric]++;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset(): void {
    Object.keys(this.metrics).forEach((key) => {
      this.metrics[key as keyof typeof this.metrics] = 0;
    });
  }
}

const metrics = new MetricsCollector();

const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" },
    { emit: "event", level: "info" },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

prisma.$on("query", (e: any) => {
  metrics.increment("dbQueries");

  if (e.duration > config.monitoring.slowQueryThreshold) {
    metrics.increment("slowQueries");
    console.warn(
      `Slow query detected (${e.duration}ms):`,
      e.query.substring(0, 100)
    );
  }
});

prisma.$on("error", (e: any) => {
  metrics.increment("errors");
  console.error("Prisma error:", e);
});

class CacheLayer {
  async get(
    key: string,
    ttl: number = config.cache.defaultTTL
  ): Promise<any | null> {
    try {
      if (redis && redis.status === "ready") {
        const result = await redis.get(key);
        if (result) {
          metrics.increment("cacheHits");
          return JSON.parse(result);
        }
      }

      const memResult = memoryCache.get(key, ttl);
      if (memResult) {
        metrics.increment("cacheHits");
        return memResult;
      }

      metrics.increment("cacheMisses");
      return null;
    } catch (error: any) {
      if (!error.message?.includes("Connection is closed")) {
        console.warn("Cache get error:", error);
      }
      metrics.increment("cacheMisses");
      return null;
    }
  }

  async set(
    key: string,
    data: any,
    ttl: number = config.cache.defaultTTL
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(data);

      if (redis && redis.status === "ready") {
        await redis.setex(key, ttl, serialized);
      }

      memoryCache.set(key, data, ttl);
    } catch (error: any) {
      if (!error.message?.includes("Connection is closed")) {
        console.warn("Cache set error:", error);
      }
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      if (redis && redis.status === "ready") {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }

      memoryCache.clear();
    } catch (error: any) {
      if (!error.message?.includes("Connection is closed")) {
        console.warn("Cache invalidation error:", error);
      }
    }
  }

  async clear(): Promise<void> {
    try {
      if (redis && ["connect", "connecting", "ready"].includes(redis.status)) {
        try {
          await redis.flushall();
        } catch (err: any) {
          if (!err.message.includes("Connection is closed")) {
            console.warn("Redis flushall error:", err);
          }
        }
      }
      memoryCache.clear();
    } catch (error: any) {
      if (!error.message?.includes("Connection is closed")) {
        console.warn("Cache clear error (non-critical):", error);
      }
    }
  }
}

const cache = new CacheLayer();

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

const circuitBreaker = new CircuitBreaker();

async function retryQuery<T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number;
    factor?: number;
    minTimeout?: number;
    maxTimeout?: number;
    skipCircuitBreaker?: boolean;
  }
): Promise<T> {
  const opts = {
    retries: config.database.maxRetries,
    factor: 2,
    minTimeout: config.database.baseDelay,
    maxTimeout: config.database.maxDelay,
    skipCircuitBreaker: false,
    ...options,
  };

  const executeQuery = async () => {
    try {
      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;

      if (duration > config.monitoring.slowQueryThreshold) {
        console.warn(`Slow query: ${duration}ms`);
      }

      return result;
    } catch (error: any) {
      const isRetriableError =
        ["P1001", "P1008", "P1017", "P2024", "P2034"].includes(error.code) ||
        error.message?.includes("Connection terminated") ||
        error.message?.includes("ECONNRESET") ||
        error.message?.includes("Connection pool timeout");

      if (!isRetriableError) {
        throw new AbortError(error);
      }

      metrics.increment("retries");
      throw error;
    }
  };

  if (opts.skipCircuitBreaker) {
    return pRetry(executeQuery, opts);
  }

  return pRetry(() => circuitBreaker.execute(executeQuery), opts);
}

function generateCacheKey(
  namespace: string,
  operation: string,
  args: any
): string {
  const argsHash = JSON.stringify(args, (key, value) => {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object" && value !== null) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: any, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {});
    }
    return value;
  });

  return `${namespace}:${operation}:${Buffer.from(argsHash).toString("base64")}`;
}

async function cachedQuery<T>(
  namespace: string,
  operation: string,
  args: any,
  queryFn: () => Promise<T>,
  options?: {
    ttl?: number;
    useCache?: boolean;
    skipCircuitBreaker?: boolean;
  }
): Promise<T> {
  const opts = {
    ttl: config.cache.defaultTTL,
    useCache: true,
    skipCircuitBreaker: false,
    ...options,
  };

  if (!opts.useCache) {
    return retryQuery(queryFn, { skipCircuitBreaker: opts.skipCircuitBreaker });
  }

  const cacheKey = generateCacheKey(namespace, operation, args);
  const cached = await cache.get(cacheKey, opts.ttl);

  if (cached !== null) {
    return cached;
  }

  const result = await retryQuery(queryFn, {
    skipCircuitBreaker: opts.skipCircuitBreaker,
  });

  await cache.set(cacheKey, result, opts.ttl);
  return result;
}

async function invalidateCache(patterns: string[]): Promise<void> {
  for (const pattern of patterns) {
    await cache.invalidate(pattern);
  }
}

async function healthCheck(): Promise<{
  database: boolean;
  redis: boolean;
  circuitBreaker: any;
  metrics: any;
  cacheStats: any;
}> {
  const dbHealthy = await checkDatabaseHealth();
  const redisHealthy = await checkRedisHealth();

  return {
    database: dbHealthy,
    redis: redisHealthy,
    circuitBreaker: circuitBreaker.getState(),
    metrics: metrics.getMetrics(),
    cacheStats: memoryCache.getStats(),
  };
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await retryQuery(() => prisma.$queryRaw`SELECT 1`, { retries: 1 });
    return true;
  } catch {
    return false;
  }
}

async function checkRedisHealth(): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

let isShuttingDown = false;

async function shutdown(): Promise<void> {
  if (isShuttingDown) {
    console.log("Shutdown already in progress...");
    return;
  }
  isShuttingDown = true;

  console.log("Shutting down gracefully...");

  try {
    await cache.clear();

    if (redis && ["connect", "connecting", "ready"].includes(redis.status)) {
      try {
        await redis.quit();
      } catch (err: any) {
        if (!err.message.includes("Connection is closed")) {
          console.warn("Redis quit error:", err.message);
        }
      }
    }

    await prisma.$disconnect();

    console.log("Shutdown complete");
  } catch (error) {
    console.error("Error during shutdown:", error);
  } finally {
    setTimeout(() => {
      console.warn("Forcing process exit after shutdown timeout");
      process.exit(0);
    }, 3000);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const db = {
  findMany: <T>(
    model: string,
    args?: any,
    options?: { ttl?: number; useCache?: boolean }
  ): Promise<T[]> =>
    cachedQuery(
      model,
      "findMany",
      args,
      () => (prisma as any)[model].findMany(args),
      options
    ),

  findUnique: <T>(
    model: string,
    args: any,
    options: { ttl?: number; useCache?: boolean } = {}
  ): Promise<T | null> => {
    return cachedQuery(
      model,
      "findUnique",
      args,
      () => (prisma as any)[model].findUnique(args),
      options
    );
  },

  findFirst: <T>(
    model: string,
    args?: any,
    options?: { ttl?: number; useCache?: boolean }
  ): Promise<T | null> =>
    cachedQuery(
      model,
      "findFirst",
      args,
      () => (prisma as any)[model].findFirst(args),
      options
    ),

  count: <T>(
    model: string,
    args?: any,
    options?: { ttl?: number; useCache?: boolean }
  ) =>
    cachedQuery(
      model,
      "count",
      args,
      () => (prisma as any)[model].count(args),
      options
    ),

  aggregate: <T>(
    model: string,
    args?: any,
    options?: { ttl?: number; useCache?: boolean }
  ) =>
    cachedQuery(
      model,
      "aggregate",
      args,
      () => (prisma as any)[model].aggregate(args),
      options
    ),

  create: async <T>(model: string, args: any) => {
    const result = await retryQuery(() => (prisma as any)[model].create(args));
    await invalidateCache([`${model}:*`]);
    return result;
  },

  update: async <T>(model: string, args: any) => {
    const result = await retryQuery(() => (prisma as any)[model].update(args));
    await invalidateCache([`${model}:*`]);
    return result;
  },

  upsert: async <T>(model: string, args: any) => {
    const result = await retryQuery(() => (prisma as any)[model].upsert(args));
    await invalidateCache([`${model}:*`]);
    return result;
  },

  delete: async <T>(model: string, args: any) => {
    const result = await retryQuery(() => (prisma as any)[model].delete(args));
    await invalidateCache([`${model}:*`]);
    return result;
  },

  deleteMany: async <T>(model: string, args: any) => {
    const result = await retryQuery(() =>
      (prisma as any)[model].deleteMany(args)
    );
    await invalidateCache([`${model}:*`]);
    return result;
  },

  updateMany: async <T>(model: string, args: any) => {
    const result = await retryQuery(() =>
      (prisma as any)[model].updateMany(args)
    );
    await invalidateCache([`${model}:*`]);
    return result;
  },

  transaction: async <T>(operations: any[]) => {
    const result = await retryQuery(() => prisma.$transaction(operations));
    await cache.clear();
    return result;
  },

  queryRaw: <T>(
    queryFn: () => any,
    options?: { ttl?: number; useCache?: boolean }
  ) => {
    const queryString = queryFn.toString();
    return cachedQuery("raw", "query", queryString, queryFn, options);
  },

  queryRawWithCache: <T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    options?: { ttl?: number; useCache?: boolean }
  ): Promise<T> => cachedQuery("raw", "query", cacheKey, queryFn, options),

  executeRaw: async (query: any) => {
    const result = await retryQuery(() => prisma.$executeRaw(query));
    await cache.clear();
    return result;
  },

  $disconnect: async () => {
    await shutdown();
  },
};

export {
  prisma,
  db,
  retryQuery,
  cachedQuery,
  healthCheck,
  shutdown,
  invalidateCache,
  metrics,
  config,
};
