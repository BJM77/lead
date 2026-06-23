import { browserPool } from './browser-pool';
import { logger } from './logger';

export async function checkPuppeteerHealth(): Promise<{ status: 'ok' | 'error'; message: string }> {
  try {
    const browser = await browserPool.acquire();
    const page = await browser.newPage();
    const version = await browser.version();
    await page.goto('about:blank');
    await page.close();
    
    // Check if we can execute JS
    const testPage = await browser.newPage();
    await testPage.goto('about:blank');
    const result = await testPage.evaluate(() => 'ok');
    await testPage.close();
    
    return { 
      status: 'ok', 
      message: `Puppeteer ${version} is operational` 
    };
  } catch (error: any) {
    logger.error(`[Puppeteer Health] Check failed: ${error.message}`);
    return { 
      status: 'error', 
      message: `Puppeteer is not operational: ${error.message}` 
    };
  }
}
