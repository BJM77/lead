import { logger } from './logger';

export class RetryStrategy {
  /**
   * Executes a function with exponential backoff and randomized jitter on failure.
   */
  static async withExponentialBackoff<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      jitter?: boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 5,
      baseDelay = 1000,
      maxDelay = 60000,
      jitter = true,
    } = options;

    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Immediately propagate client/permission errors that cannot be resolved by retrying
        if (error.status === 400 || error.status === 403) {
          logger.warn(`[RetryStrategy] Non-retryable error encountered: Status ${error.status}`);
          throw error;
        }

        if (attempt === maxRetries) break;

        // Calculate backoff delay
        let delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

        // Add randomized jitter to prevent synchronized retry thundering herds
        if (jitter) {
          delay = delay * (0.5 + Math.random() * 0.5);
        }

        logger.info(
          `[RetryStrategy] Attempt ${attempt} failed. Retrying in ${Math.round(delay)}ms... Error: ${error.message || error}`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }
}
