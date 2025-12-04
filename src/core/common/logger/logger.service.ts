import { Logger } from "winston";
import logger from "./logger";

class LoggerService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  info(message: string): void {
    this.logger.info(message);
  }

  error(message: string | Error): void {
    if (message instanceof Error) {
      this.logger.error(message);
    } else {
      this.logger.error(message);
    }
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  debug(message: string): void {
    this.logger.debug(message);
  }

  verbose(message: string): void {
    this.logger.verbose(message);
  }
}

const loggerInstance = new LoggerService(logger);

export default loggerInstance;
