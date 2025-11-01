import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize, errors } = format;

function getCallSiteInfo(): string {
  const stack = new Error().stack;
  if (!stack) return "";
  const stackLines = stack.split("\n");
  const callerLine = stackLines[3] || stackLines[2] || stackLines[1];
  return callerLine ? callerLine.trim() : "";
}

const customFormat = printf(({ level, message, timestamp, stack }) => {
  const callSite = getCallSiteInfo();
  return stack
    ? `${timestamp} [${level}] ${callSite}: ${stack}`
    : `${timestamp} [${level}] ${callSite}: ${message}`;
});

const logger = createLogger({
  level: "debug",
  format: combine(
    colorize({ all: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    customFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/combined.log" }),
  ],
});

export default logger;
