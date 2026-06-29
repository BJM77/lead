import { playwrightScraper } from './scraper-playwright';
import { logger } from './logger';

export async function cleanup() {
  logger.info('[Cleanup] Starting graceful shutdown...');
  try {
    await playwrightScraper.close();
    logger.info('[Cleanup] Playwright browser closed');
  } catch (error: any) {
    logger.error(`[Cleanup] Error closing Playwright: ${error.message}`);
  }
}

if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
}
