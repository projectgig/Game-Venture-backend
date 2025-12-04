import { GlobalExceptionHandler } from "./global.exception";

class ExceptionManager {
  private static instance: ExceptionManager;
  public handler: GlobalExceptionHandler;

  private constructor() {
    this.handler = new GlobalExceptionHandler();
  }

  public static getInstance(): ExceptionManager {
    if (!ExceptionManager.instance) {
      ExceptionManager.instance = new ExceptionManager();
    }
    return ExceptionManager.instance;
  }
}

export default ExceptionManager.getInstance();
