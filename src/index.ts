import "dotenv/config";

/* eslint-disable @typescript-eslint/no-require-imports */
// require("newrelic");
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan, { StreamOptions } from "morgan";
import logger from "@game/common/logger/logger.service";
import exceptionManager from "@game/common/exceptions/index";
import { env } from "@game/config/env";
import swaggerSpec from "@game/utils/swagger";
import swaggerUi from "swagger-ui-express";
import { mainRoutes } from "@game/routes/index";
import bodyParser from "body-parser";
import { Request, Response } from "express";
import cookieParser from "cookie-parser";

// App Configuration
class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.config();
    this.routes();
    // this.seed();
  }

  private config(): void {
    dotenv.config();

    // CORS
    this.app.use(cookieParser());

    this.app.use(cors({ origin: env.CORS_ORIGIN || "*", credentials: true }));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    this.app.use(express.static("public"));
    // focefully disable caching
    this.app.use((req, res, next) => {
      res.set("Cache-Control", "no-store");
      next();
    });

    // Swagger Docs
    this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Static files
    this.app.use(express.static("public"));

    // HTTP Request logging with morgan
    const stream: StreamOptions = {
      write: (message: string) => logger.info(message.trim()),
    };

    const skip = (_: Request, res: Response) => res.statusCode < 400;

    if (env.NODE_ENV === "production") {
      this.app.use(morgan("combined", { stream, skip }));
    } else {
      this.app.use(morgan("dev", { stream }));
    }
  }

  private routes(): void {
    this.app.get("/", (_, res: Response) => {
      console.log("Root route hit – sending: Hello World!");
      res.send("Hello World!");
    });

    this.app.get("/api/health", (_, res) => {
      res.status(200).json({
        status: "Status up and running",
        message: "Server is running",
        timestamp: new Date().toISOString(),
        env: env.NODE_ENV,
      });
    });

    this.app.use("/api", mainRoutes);
    this.app.use(exceptionManager.handler.handleErrors);
  }

  public start(port: number): void {
    this.app.listen(port, "0.0.0.0", () => {
      logger.info(`Server started on port ${port} in ${env.NODE_ENV} mode`);
      logger.info(`http://localhost:${port}`);
    });
  }

  public stop(): void {
    process.exit(0);
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start server
const port = parseInt(env.PORT, 10) || 3000;
const appInstance = new App();
appInstance.start(port);

export default appInstance;
