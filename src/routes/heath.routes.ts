import { Router } from "express";
import { healthCheck } from "../database/prismaClient";
import newrelic from "newrelic";

const router = Router();

router.get("/health", async (_, res) => {
  try {
    const health = await healthCheck();

    newrelic.recordCustomEvent("HealthCheck", {
      database: health.database,
      redis: health.redis,
      timestamp: new Date().toISOString(),
    });

    res.status(health.database && health.redis ? 200 : 503).json({
      status: health.database && health.redis ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      // ...health,
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
