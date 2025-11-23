import dotenv from "dotenv";
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || "5000",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  DATABASE_URL: process.env.DATABASE_URL || "",
  STAGING_URL: process.env.STAGING_URL || "",

  // JWT configuration
  JWT_SECRET:
    process.env.JWT_SECRET ||
    "rd4jpz8r2czZ7+pRltcC8l2B+lEKjLZnANpN9fbnDlg_)sfdadsfe3U/Wm0lUSef32bIqMdUEenLnsZA1ynv+Nh29MzFPEA==",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",

  // Redis configuration
  REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
  REDIS_PORT: process.env.REDIS_PORT || "6379",

  ADMIN_USERNAME: process.env.ADMIN_USERNAME || "admin",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "password",

  ACCESS_TOKEN_SECRET:
    process.env.ACCESS_TOKEN_SECRET ||
    "rd4jpz8r2czZ7+pRltcC8l2B+lEKjLZnANp_fsauhJHGYJGY@34N9fbnDlge3U/Wm0lUSef32bIqMdUEenLnsZA1ynv+Nh29MzFPEA==",
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",

  REFRESH_TOKEN_SECRET:
    process.env.REFRESH_TOKEN_SECRET ||
    "rd4jpz8r2czZ7+pRltcC8l2B+lEKjLZnANp_*knjasdjkhKHJN9fbnDlge3U/Wm0lUSef32bIqMdUEenLnsZA1ynv+Nh29MzFPEA==",
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
};
