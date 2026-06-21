/**
 * @fileOverview A utility for retrying asynchronous operations with exponential backoff.
 */
import { logger } from './logger';

export class RetryManager {
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      retryableErrors?: string[];
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      retryableErrors = ['ECONNRESET', 'ETIMEDOUT', '429', '500', '502', '503', '504']
    } = options;

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        const shouldRetry = retryableErrors.some(err => 
          error.message?.includes(err) || error.code === err
        );
        
        if (!shouldRetry || attempt === maxRetries) {
          throw error;
        }

        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelay
        );
        
        logger.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${Math.round(delay)}ms... Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }
}
