import { logger } from './logger';

export class ErrorHandler {
  /**
   * Runs an operation and returns a fallback value if it throws an error.
   */
  static async withFallback<T>(
    fn: () => Promise<T>,
    fallback: T,
    context: string
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      logger.error(`[ErrorHandler - ${context}] Operation failed: ${error.message || error}`);
      return fallback;
    }
  }

  /**
   * Retries an async function with exponential backoff.
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: { maxAttempts?: number; delay?: number; context?: string } = {}
  ): Promise<T> {
    const { maxAttempts = 3, delay = 1000, context = 'Operation' } = options;
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`[ErrorHandler - ${context}] Attempt ${i + 1} failed: ${lastError.message}.`);
        if (i < maxAttempts - 1) {
          const backoff = delay * Math.pow(2, i);
          logger.info(`[ErrorHandler - ${context}] Retrying in ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    }
    throw lastError || new Error(`${context} failed after ${maxAttempts} attempts`);
  }
}
