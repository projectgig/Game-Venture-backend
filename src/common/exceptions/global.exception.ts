import { Request, Response, NextFunction } from "express";
import logger from "@game/common/logger/logger.service";

export class GlobalExceptionHandler {
  public handleErrors = (
    err: any,
    req: Request,
    res: Response,
    _: NextFunction
  ) => {
    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (statusCode >= 500) {
      logger.error(
        `HTTP ${statusCode} - ${req.method} ${req.originalUrl} - ${
          err.stack || err
        }`
      );
    } else {
      logger.warn(
        `HTTP ${statusCode} - ${req.method} ${req.originalUrl} - ${message}`
      );
    }

    res.status(statusCode).json({
      success: false,
      status: statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
  };
}
