import { smartScraper } from './smart-scraper';
import { contentExtractor } from './content-extractor';
import { logger } from './logger';

interface DeepCrawlResult {
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

export class DeepCrawler {
  private static instance: DeepCrawler;

  static getInstance(): DeepCrawler {
    if (!DeepCrawler.instance) {
      DeepCrawler.instance = new DeepCrawler();
    }
    return DeepCrawler.instance;
  }

  async crawl(url: string, maxPages: number = 3): Promise<DeepCrawlResult> {
    const startTime = Date.now();
    logger.info(`[DeepCrawler] Starting smart deep crawl for ${url}`);

    // 1. Scrape the homepage first
    const primaryResult = await smartScraper.scrape(url);
    if (!primaryResult.success || !primaryResult.html) {
      logger.warn(`[DeepCrawler] Homepage crawl failed for ${url}`);
      return primaryResult;
    }

    // 2. Extract internal links from homepage to locate Contact/About pages
    const extraction = contentExtractor.extract(primaryResult.html, url);
    const subpagesToVisit = this._findHighValuePages(extraction.internalLinks);

    if (subpagesToVisit.length === 0) {
      logger.info(`[DeepCrawler] No high-value subpages identified to follow.`);
      return primaryResult;
    }

    const pagesToScrape = subpagesToVisit.slice(0, maxPages - 1);
    logger.info(`[DeepCrawler] Found ${pagesToScrape.length} subpages to follow: ${pagesToScrape.join(', ')}`);

    // 3. Crawl secondary pages
    let combinedHtml = primaryResult.html;
    const combinedEmails = new Set(primaryResult.emails);
    const combinedSocialLinks = new Map<string, string>();
    
    primaryResult.companyInfo.socialLinks.forEach(link => {
      combinedSocialLinks.set(link.platform, link.url);
    });

    for (const path of pagesToScrape) {
      try {
        const absoluteUrl = new URL(path, url).toString();
        logger.info(`[DeepCrawler] Crawling subpage: ${absoluteUrl}`);
        const subpageResult = await smartScraper.scrape(absoluteUrl);

        if (subpageResult.success && subpageResult.html) {
          // Append subpage context
          combinedHtml += `\n\n<!-- SUBPAGE: ${path} -->\n` + subpageResult.html;
          
          // Merge emails
          subpageResult.emails.forEach(email => combinedEmails.add(email));
          
          // Merge social links
          subpageResult.companyInfo.socialLinks.forEach(link => {
            if (!combinedSocialLinks.has(link.platform)) {
              combinedSocialLinks.set(link.platform, link.url);
            }
          });
        }
      } catch (err: any) {
        logger.warn(`[DeepCrawler] Failed crawling subpage ${path}: ${err.message}`);
      }
    }

    return {
      ...primaryResult,
      html: combinedHtml,
      emails: Array.from(combinedEmails),
      companyInfo: {
        ...primaryResult.companyInfo,
        socialLinks: Array.from(combinedSocialLinks.entries()).map(([platform, url]) => ({
          platform,
          url,
        })),
      },
      duration: Date.now() - startTime,
    };
  }

  private _findHighValuePages(paths: string[]): string[] {
    const highValuePattern = /(contact|about|team|staff|people|story|profile|info)/i;
    
    return paths.filter(path => {
      // Avoid document downloads, assets, or query strings
      if (/\.(pdf|jpg|png|zip|doc)$/i.test(path)) return false;
      return highValuePattern.test(path);
    });
  }
}

export const deepCrawler = DeepCrawler.getInstance();
