import loggerInstance from "@game/core/common/logger/logger.service";
import { env } from "@game/core/common/config/env";
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Game Venture API Documentation",
      version: "1.0.0",
      description: "API documentation for Game Venture",
    },
    servers: [
      {
        url:
          env.NODE_ENV === "local"
            ? `http://localhost:${env.PORT}`
            : `${env.STAGING_URL}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

loggerInstance.info("Swagger documentation generated");

export default swaggerSpec;
