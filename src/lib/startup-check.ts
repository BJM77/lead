import { logger } from './logger';

export async function validateEnvironment() {
  const requiredEnvVars = [
    'GOOGLE_MAPS_API_KEY',
    'GOOGLE_APPLICATION_CREDENTIALS',
  ];

  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.warn(`[Startup] Missing environment variables: ${missing.join(', ')}`);
  } else {
    logger.info('[Startup] All critical environment credentials detected.');
  }

  // Check Puppeteer
  try {
    const { checkPuppeteerHealth } = await import('./puppeteer-health');
    const status = await checkPuppeteerHealth();
    if (status.status === 'ok') {
      logger.info('[Startup] Puppeteer environment validation succeeded.');
    } else {
      logger.error(`[Startup] Puppeteer check failed: ${status.message}`);
    }
  } catch (error) {
    logger.error(`[Startup] Failed to check Puppeteer health: ${error}`);
  }
}
