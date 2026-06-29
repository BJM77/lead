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
}
