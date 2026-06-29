/**
 * COMPLETE SELF-CONTAINED SCRAPER
 * No external services, no paid APIs, no subscriptions
 * Uses only Playwright (free, open-source)
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// 1. USER AGENT ROTATOR (Self-contained, no API calls)
// ============================================================

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

const ACCEPT_LANGUAGES = [
  'en-US,en;q=0.9',
  'en-US,en;q=0.8',
  'en-GB,en;q=0.9',
  'en-AU,en;q=0.9',
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1680, height: 1050 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
];

function getRandomFingerprint() {
  return {
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    acceptLanguage: ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)],
    viewport: VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)],
  };
}

// ============================================================
// 2. SELF-CONTAINED EMAIL DISCOVERY (No APIs)
// ============================================================

class EmailDiscoverer {
  private patterns: Array<{ regex: RegExp; type: string }> = [
    { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, type: 'standard' },
  ];

  extractEmails(text: string): string[] {
    const emails = new Set<string>();
    for (const pattern of this.patterns) {
      const matches = text.match(pattern.regex);
      if (matches) {
        matches.forEach(e => emails.add(e.toLowerCase()));
      }
    }
    return Array.from(emails);
  }

  generatePermutations(name: string, domain: string): string[] {
    if (!name || !domain) return [];

    const cleanDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    const nameParts = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/);
    if (nameParts.length < 1) return [];

    const first = nameParts[0];
    const last = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const permutations = new Set<string>();

    if (first && last) {
      const f = first[0];
      const l = last[0];
      permutations.add(`${first}.${last}@${cleanDomain}`);
      permutations.add(`${f}${last}@${cleanDomain}`);
      permutations.add(`${first}${l}@${cleanDomain}`);
      permutations.add(`${first}_${last}@${cleanDomain}`);
      permutations.add(`${first}${last}@${cleanDomain}`);
      permutations.add(`${last}${first}@${cleanDomain}`);
      permutations.add(`${last}.${first}@${cleanDomain}`);
      permutations.add(`${first}@${cleanDomain}`);
    } else if (first) {
      permutations.add(`${first}@${cleanDomain}`);
    }

    if (cleanDomain) {
      permutations.add(`info@${cleanDomain}`);
      permutations.add(`contact@${cleanDomain}`);
      permutations.add(`hello@${cleanDomain}`);
      permutations.add(`sales@${cleanDomain}`);
      permutations.add(`support@${cleanDomain}`);
    }

    return Array.from(permutations);
  }
}

export const emailDiscoverer = new EmailDiscoverer();

// ============================================================
// 3. SELF-CONTAINED COMPANY ENRICHMENT (No APIs)
// ============================================================

class CompanyEnricher {
  extractCompanyInfo(html: string, url: string): {
    name: string;
    industry?: string;
    employeeCount?: string;
    description?: string;
    socialLinks: { platform: string; url: string }[];
  } {
    let domain = '';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      domain = url;
    }
    const name = domain.split('.')[0] || domain;

    let description = '';
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    if (metaDescMatch) description = metaDescMatch[1];

    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i);
    const ogTitle = ogTitleMatch ? ogTitleMatch[1] : '';

    const socialLinks: { platform: string; url: string }[] = [];
    const socialPatterns = [
      { platform: 'linkedin', regex: /https?:\/\/(?:[a-z]+\.)?linkedin\.com\/[^\s"']+/gi },
      { platform: 'twitter', regex: /https?:\/\/(?:[a-z]+\.)?(?:twitter|x)\.com\/[^\s"']+/gi },
      { platform: 'facebook', regex: /https?:\/\/(?:[a-z]+\.)?facebook\.com\/[^\s"']+/gi },
      { platform: 'instagram', regex: /https?:\/\/(?:[a-z]+\.)?instagram\.com\/[^\s"']+/gi },
      { platform: 'youtube', regex: /https?:\/\/(?:[a-z]+\.)?youtube\.com\/[^\s"']+/gi },
    ];

    for (const pattern of socialPatterns) {
      const matches = html.match(pattern.regex);
      if (matches) {
        matches.forEach(u => socialLinks.push({ platform: pattern.platform, url: u }));
      }
    }

    let employeeCount: string | undefined;
    const empPatterns = [
      /(\d+)\s*[-–]\s*(\d+)\s+employees/i,
      /(\d+)\s+employees?/i,
      /employee\s+count\s*[:=]\s*(\d+)/i,
      /team\s+of\s+(\d+)/i,
    ];
    for (const pattern of empPatterns) {
      const match = html.match(pattern);
      if (match) {
        employeeCount = match[0];
        break;
      }
    }

    return {
      name: ogTitle || name,
      industry: this.extractIndustry(html),
      employeeCount,
      description,
      socialLinks,
    };
  }

  private extractIndustry(html: string): string | undefined {
    const industryKeywords = [
      'technology', 'software', 'hardware', 'ai', 'machine learning',
      'finance', 'banking', 'insurance', 'investment',
      'healthcare', 'medical', 'pharmaceutical', 'biotech',
      'education', 'e-learning', 'training',
      'retail', 'e-commerce', 'fashion', 'consumer goods',
      'manufacturing', 'industrial', 'automotive',
      'logistics', 'supply chain', 'warehouse', 'shipping',
      'real estate', 'construction', 'architecture',
      'hospitality', 'travel', 'tourism',
      'media', 'entertainment', 'publishing',
      'consulting', 'professional services', 'legal', 'accounting',
    ];

    const lowerHtml = html.toLowerCase();
    for (const keyword of industryKeywords) {
      if (lowerHtml.includes(keyword)) {
        return keyword;
      }
    }
    return undefined;
  }
}

export const companyEnricher = new CompanyEnricher();

// ============================================================
// 4. MAIN PLAYWRIGHT SCRAPER
// ============================================================

export interface ScrapeOptions {
  waitForSelector?: string;
  waitForTimeout?: number;
  screenshotOnError?: boolean;
  blockResources?: boolean;
  waitForNetworkIdle?: boolean;
  timeout?: number;
  maxRetries?: number;
  saveScreenshots?: boolean;
}

export class PlaywrightScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private static instance: PlaywrightScraper;
  private screenshotDir: string;

  private constructor() {
    this.screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  static getInstance(): PlaywrightScraper {
    if (!PlaywrightScraper.instance) {
      PlaywrightScraper.instance = new PlaywrightScraper();
    }
    return PlaywrightScraper.instance;
  }

  async init(): Promise<void> {
    if (this.browser) return;

    const fingerprint = getRandomFingerprint();

    try {
      this.browser = await chromium.launch({
        headless: true,
        timeout: 30000,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
          '--disable-web-security',
          '--disable-features=BlockInsecurePrivateNetworkRequests',
          '--disable-features=SameSiteByDefaultCookies',
          '--js-flags=--max-old-space-size=512',
          `--window-size=${fingerprint.viewport.width},${fingerprint.viewport.height}`,
          '--disable-notifications',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
      });

      this.context = await this.browser.newContext({
        viewport: fingerprint.viewport,
        userAgent: fingerprint.userAgent,
        locale: 'en-US',
        timezoneId: 'America/New_York',
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        javaScriptEnabled: true,
        bypassCSP: true,
        extraHTTPHeaders: {
          'Accept-Language': fingerprint.acceptLanguage,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Charset': 'utf-8',
          'Cache-Control': 'max-age=0',
          'Upgrade-Insecure-Requests': '1',
        },
        ignoreHTTPSErrors: true,
      });

      logger.info('[PlaywrightScraper] Browser initialized successfully');
    } catch (error: any) {
      logger.error(`[PlaywrightScraper] Failed to initialize browser: ${error.message}`);
      throw error;
    }
  }

  async scrape(url: string, options: ScrapeOptions = {}): Promise<{
    html: string;
    emails: string[];
    companyInfo: ReturnType<CompanyEnricher['extractCompanyInfo']>;
    method: string;
    duration: number;
    success: boolean;
    error?: string;
  }> {
    await this.init();
    const startTime = Date.now();

    const maxRetries = options.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this._scrapePage(url, options, attempt);
        const duration = Date.now() - startTime;

        const emails = emailDiscoverer.extractEmails(result);
        const companyInfo = companyEnricher.extractCompanyInfo(result, url);

        logger.info(`[PlaywrightScraper] Successfully scraped ${url} in ${duration}ms (attempt ${attempt})`);

        return {
          html: result,
          emails,
          companyInfo,
          method: 'playwright',
          duration,
          success: true,
        };
      } catch (error: any) {
        lastError = error;
        logger.warn(`[PlaywrightScraper] Attempt ${attempt} failed for ${url}: ${error.message}`);

        if (attempt < maxRetries) {
          const delay = 2000 * attempt;
          await this._delay(delay);
          await this._recreateContext();
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      html: '',
      emails: [],
      companyInfo: {
        name: '',
        socialLinks: [],
      },
      method: 'playwright',
      duration,
      success: false,
      error: lastError?.message || 'All attempts failed',
    };
  }

  private async _scrapePage(url: string, options: ScrapeOptions, attempt: number): Promise<string> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = await this.context.newPage();
    const timeout = options.timeout || 30000;

    try {
      await page.addInitScript(`
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {}, app: {} };
      `);

      if (options.blockResources !== false) {
        await page.route('**/*', (route) => {
          const resourceType = route.request().resourceType();
          const blocked = ['image', 'font', 'media', 'manifest'];
          if (blocked.includes(resourceType)) {
            route.abort('blockedbyclient');
          } else {
            route.continue();
          }
        });
      }

      const waitUntil = options.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded';
      await page.goto(url, { waitUntil, timeout });

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      }

      if (options.waitForTimeout) {
        await page.waitForTimeout(options.waitForTimeout);
      }

      await this._scrollToBottom(page);

      const content = await page.content();

      if (content.length < 500) {
        throw new Error('Page content too short, likely blocked');
      }

      if (options.saveScreenshots) {
        try {
          const filename = `${Date.now()}-${new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
          await page.screenshot({
            path: path.join(this.screenshotDir, filename),
            fullPage: true,
          });
        } catch (e) {}
      }

      return content;
    } catch (error) {
      if (options.screenshotOnError || attempt === 1) {
        try {
          const filename = `error-${Date.now()}-${new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
          await page.screenshot({
            path: path.join(this.screenshotDir, filename),
            fullPage: true,
          });
        } catch (e) {}
      }
      throw error;
    } finally {
      await page.close();
    }
  }

  private async _scrollToBottom(page: Page): Promise<void> {
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    let currentScroll = 0;

    while (currentScroll < scrollHeight) {
      currentScroll = await page.evaluate((step) => {
        window.scrollTo(0, window.scrollY + step);
        return window.scrollY;
      }, 300);
      await page.waitForTimeout(50);
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
  }

  private async _recreateContext(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      const fingerprint = getRandomFingerprint();
      this.context = await this.browser.newContext({
        viewport: fingerprint.viewport,
        userAgent: fingerprint.userAgent,
        locale: 'en-US',
        timezoneId: 'America/New_York',
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
          'Accept-Language': fingerprint.acceptLanguage,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'max-age=0',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      await this.context.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        const blocked = ['image', 'font', 'media', 'manifest'];
        if (blocked.includes(resourceType)) {
          route.abort('blockedbyclient');
        } else {
          route.continue();
        }
      });

      logger.info('[PlaywrightScraper] Context recreated with new fingerprint');
    }
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      logger.info('[PlaywrightScraper] Browser closed');
    }
  }
}

export const playwrightScraper = PlaywrightScraper.getInstance();
