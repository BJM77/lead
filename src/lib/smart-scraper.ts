/**
 * SMART SCRAPER - Self-contained, no paid services
 * Tries multiple strategies in order of speed/success
 */

import { playwrightScraper } from './scraper-playwright';
import { logger } from './logger';

interface ScrapeResult {
  html: string;
  emails: string[];
  companyInfo: {
    name: string;
    industry?: string;
    employeeCount?: string;
    description?: string;
    socialLinks: { platform: string; url: string }[];
  };
  method: 'static' | 'playwright' | 'playwright_fallback';
  duration: number;
  success: boolean;
  error?: string;
  url: string;
}

export class SmartScraper {
  private static instance: SmartScraper;

  static getInstance(): SmartScraper {
    if (!SmartScraper.instance) {
      SmartScraper.instance = new SmartScraper();
    }
    return SmartScraper.instance;
  }

  async scrape(url: string): Promise<ScrapeResult> {
    const startTime = Date.now();
    const normalizedUrl = this._normalizeUrl(url);

    logger.info(`[SmartScraper] Scraping ${normalizedUrl}`);

    // Strategy 1: Static fetch (fastest)
    const staticResult = await this._tryStatic(normalizedUrl);
    if (staticResult.success && this._hasContent(staticResult.html)) {
      logger.info(`[SmartScraper] Static fetch succeeded for ${normalizedUrl}`);
      return {
        ...staticResult,
        duration: Date.now() - startTime,
        method: 'static',
        url: normalizedUrl,
      };
    }

    // Strategy 2: Playwright (JavaScript rendering)
    try {
      const playwrightResult = await this._tryPlaywright(normalizedUrl);
      if (playwrightResult.success && this._hasContent(playwrightResult.html)) {
        logger.info(`[SmartScraper] Playwright succeeded for ${normalizedUrl}`);
        return {
          ...playwrightResult,
          duration: Date.now() - startTime,
          method: 'playwright',
          url: normalizedUrl,
        };
      }
    } catch (error: any) {
      logger.warn(`[SmartScraper] Playwright failed: ${error.message}`);
    }

    // All failed
    return {
      html: '',
      emails: [],
      companyInfo: { name: '', socialLinks: [] },
      method: 'static',
      duration: Date.now() - startTime,
      success: false,
      error: 'All scraping strategies failed',
      url: normalizedUrl,
    };
  }

  private async _tryStatic(url: string): Promise<{
    html: string;
    emails: string[];
    companyInfo: { name: string; socialLinks: { platform: string; url: string }[] };
    success: boolean;
  }> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      
      const { emailDiscoverer, companyEnricher } = await import('./scraper-playwright');
      
      return {
        html,
        emails: emailDiscoverer.extractEmails(html),
        companyInfo: companyEnricher.extractCompanyInfo(html, url),
        success: true,
      };
    } catch (error) {
      return {
        html: '',
        emails: [],
        companyInfo: { name: '', socialLinks: [] },
        success: false,
      };
    }
  }

  private async _tryPlaywright(url: string): Promise<{
    html: string;
    emails: string[];
    companyInfo: { name: string; socialLinks: { platform: string; url: string }[] };
    success: boolean;
  }> {
    const result = await playwrightScraper.scrape(url, {
      blockResources: true,
      waitForNetworkIdle: true,
      waitForTimeout: 2000,
      maxRetries: 2,
    });

    return {
      html: result.html,
      emails: result.emails,
      companyInfo: result.companyInfo,
      success: result.success,
    };
  }

  private _hasContent(html: string): boolean {
    if (!html || html.length < 500) return false;

    const blocked = [
      'Access Denied', 'Access denied', 'Blocked',
      'Forbidden', '403 Forbidden',
      'captcha', 'CAPTCHA',
      'verify you are human',
      'rate limit',
      'Too Many Requests', '429',
      'Cloudflare', 'Please wait',
    ];

    for (const pattern of blocked) {
      if (html.includes(pattern)) return false;
    }

    return true;
  }

  private _normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }
}

export const smartScraper = SmartScraper.getInstance();
