import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { logger } from './logger';

puppeteer.use(StealthPlugin());

class BrowserPool {
  private static instance: BrowserPool;
  private browsers: any[] = [];
  private maxSize = 3;

  static getInstance(): BrowserPool {
    if (!BrowserPool.instance) {
      BrowserPool.instance = new BrowserPool();
    }
    return BrowserPool.instance;
  }

  async acquire(): Promise<any> {
    // Clean up dead browsers first
    this.cleanupDeadBrowsers();

    // Try to get an existing browser
    for (let i = 0; i < this.browsers.length; i++) {
      try {
        // Check if browser is still connected
        await this.browsers[i].version();
        return this.browsers[i];
      } catch (e) {
        // Browser is dead, remove it
        this.browsers.splice(i, 1);
        i--;
      }
    }

    // Create new browser if we're under the limit
    if (this.browsers.length < this.maxSize) {
      const browser = await this.launchBrowser();
      this.browsers.push(browser);
      return browser;
    }

    // Wait for a browser to be released (simple poll)
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      for (const browser of this.browsers) {
        try {
          await browser.version();
          return browser;
        } catch (e) {
          // Browser is dead, remove it
          const index = this.browsers.indexOf(browser);
          if (index > -1) {
            this.browsers.splice(index, 1);
          }
        }
      }
      attempts++;
    }

    // Force create one if we can't find one
    const browser = await this.launchBrowser();
    this.browsers.push(browser);
    return browser;
  }

  private async launchBrowser(): Promise<any> {
    logger.info('[BrowserPool] Launching new browser instance');
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
      ],
      timeout: 30000,
    });
  }

  private cleanupDeadBrowsers() {
    for (let i = 0; i < this.browsers.length; i++) {
      try {
        this.browsers[i].version().catch(() => {
          this.browsers.splice(i, 1);
          i--;
        });
      } catch (e) {
        this.browsers.splice(i, 1);
        i--;
      }
    }
  }

  async release(browser: any) {
    // We keep browsers in the pool, don't close them
    // They'll be cleaned up on next acquire if they're dead
  }

  async closeAll() {
    for (const browser of this.browsers) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore errors on close
      }
    }
    this.browsers = [];
  }
}

export const browserPool = BrowserPool.getInstance();
