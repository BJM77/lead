import { logger } from './logger';

export class ErrorLogger {
  static async logError(error: Error, context: Record<string, any> = {}) {
    logger.error(`[Error] ${error.message} - Context: ${JSON.stringify({
      stack: error.stack,
      ...context,
      timestamp: new Date().toISOString(),
    })}`);
  }

  static async logWarning(message: string, context: Record<string, any> = {}) {
    logger.warn(`[Warning] ${message} - Context: ${JSON.stringify({
      ...context,
      timestamp: new Date().toISOString(),
    })}`);
  }
}
