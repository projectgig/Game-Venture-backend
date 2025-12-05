import Redis from "ioredis";
import { env } from "@game/core/common/config/env";

const redis = new Redis({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT, 10),
});

redis.on("connect", () => {
  console.log(`Connected to Redis at ${env.REDIS_HOST}:${env.REDIS_PORT}`);
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

export default redis;
