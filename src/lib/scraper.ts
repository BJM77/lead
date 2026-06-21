import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { logger } from './logger';

puppeteer.use(StealthPlugin());

export type ScrapedLead = {
  name: string;
  company: { name: string; website?: string };
  source: string;
  details: string; // Scraped/Snippet text
};

type ScrapeWithAIParams = {
  source: 'linkedin' | 'crunchbase' | 'company-websites' | 'news-articles';
  searchTerms: string[];
  location?: string;
  maxResults: number;
};

/**
 * Decodes DuckDuckGo redirect URLs to get the target destination URL.
 */
function decodeDdgUrl(href: string): string {
  try {
    if (href.startsWith('//')) {
      href = 'https:' + href;
    }
    const url = new URL(href);
    const uddg = url.searchParams.get('uddg');
    if (uddg) {
      return decodeURIComponent(uddg);
    }
  } catch (e) {
    // Fallback to raw href if URL parsing fails
  }
  return href;
}

/**
 * Launch a headless browser instance with stealth-like configurations.
 */
async function getBrowser() {
  return await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list',
    ],
  });
}

/**
 * Perform a DuckDuckGo search using Puppeteer with retry backoff.
 */
async function searchDuckDuckGo(query: string, maxResults: number, retries = 3): Promise<{ url: string; title: string; snippet: string }[]> {
  logger.info(`[Scraper] Searching DuckDuckGo for: "${query}"`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    let browser;
    try {
      browser = await getBrowser();
      const page = await browser.newPage();
      
      // Randomize viewport slightly to avoid fingerprinting
      await page.setViewport({ width: 1280 + Math.floor(Math.random() * 100), height: 800 + Math.floor(Math.random() * 100) });

      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });

      const results = await page.evaluate(() => {
        const items: { href: string; title: string; snippet: string }[] = [];
        const resultElements = document.querySelectorAll('.result');
        
        resultElements.forEach((el) => {
          const a = el.querySelector('.result__a') as HTMLAnchorElement;
          const snippetEl = el.querySelector('.result__snippet');
          if (a && a.href) {
            items.push({
              href: a.href,
              title: a.textContent?.trim() || '',
              snippet: snippetEl?.textContent?.trim() || '',
            });
          }
        });
        return items;
      });

      const parsedResults = results
        .map(r => ({
          url: decodeDdgUrl(r.href),
          title: r.title,
          snippet: r.snippet
        }))
        .filter(r => r.url && !r.url.includes('duckduckgo.com') && !r.url.includes('google.com'))
        .slice(0, maxResults);

      logger.info(`[Scraper] DuckDuckGo returned ${parsedResults.length} organic results.`);
      return parsedResults;
    } catch (error: any) {
      logger.warn(`[Scraper] DuckDuckGo search failed (Attempt ${attempt}/${retries}): ${error.message}`);
      if (attempt === retries) return [];
      
      // Exponential backoff
      await new Promise(res => setTimeout(res, 2000 * Math.pow(2, attempt)));
    } finally {
      if (browser) await browser.close();
    }
  }
  return [];
}

/**
 * Crawls a target company website homepage and major sub-pages (About, Contact, etc.)
 * Extracts meta description, structured data, and text.
 */
export async function crawlWebsite(targetUrl: string): Promise<string> {
  logger.info(`[Scraper] Starting deep crawl of: ${targetUrl}`);
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // 1. Crawl Homepage
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    const pageData = await page.evaluate(() => {
      const cleanText = (el: HTMLElement) => {
        const ignoredTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'HEADER', 'FOOTER', 'NAV'];
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let node;
        let text = '';
        while ((node = walk.nextNode())) {
          if (node.parentElement && !ignoredTags.includes(node.parentElement.tagName)) {
            text += ' ' + node.textContent;
          }
        }
        return text.replace(/\s+/g, ' ').trim();
      };

      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map(script => script.textContent)
        .join('\n');

      const links = Array.from(document.querySelectorAll('a'))
        .map(a => ({ href: a.href, text: a.textContent?.trim() || '' }))
        .filter(l => l.href);

      return {
        text: cleanText(document.body),
        meta: metaDescription,
        jsonLd: jsonLdScripts,
        links
      };
    });

    let combinedText = `[META DESCRIPTION]\n${pageData.meta}\n\n`;
    if (pageData.jsonLd) {
        combinedText += `[STRUCTURED JSON-LD]\n${pageData.jsonLd.substring(0, 5000)}\n\n`;
    }
    combinedText += `[HOMEPAGE CONTENT]\n${pageData.text}\n\n`;

    // 2. Discover high-yield subpages (About, Contact, Team)
    const targetKeywords = ['about', 'contact', 'team', 'staff'];
    const origin = new URL(targetUrl).origin;
    
    const subpageUrls = Array.from(
      new Set(
        pageData.links
          .map(l => l.href)
          .filter(href => {
            try {
              const urlObj = new URL(href);
              if (urlObj.origin !== origin) return false;
              const path = urlObj.pathname.toLowerCase();
              return targetKeywords.some(keyword => path.includes(keyword));
            } catch (e) {
              return false;
            }
          })
      )
    ).slice(0, 2); 

    for (const subpageUrl of subpageUrls) {
      try {
        logger.info(`[Scraper] Crawling subpage: ${subpageUrl}`);
        await page.goto(subpageUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        const subpageText = await page.evaluate(() => {
          const ignoredTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'HEADER', 'FOOTER', 'NAV'];
          const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
          let node;
          let text = '';
          while ((node = walk.nextNode())) {
            if (node.parentElement && !ignoredTags.includes(node.parentElement.tagName)) {
              text += ' ' + node.textContent;
            }
          }
          return text.replace(/\s+/g, ' ').trim();
        });
        combinedText += `[SUBPAGE CONTENT: ${subpageUrl}]\n${subpageText}\n\n`;
      } catch (e: any) {
        logger.warn(`[Scraper] Failed to crawl subpage ${subpageUrl}: ${e.message}`);
      }
    }

    return combinedText.substring(0, 40000); 
  } catch (error: any) {
    logger.error(`[Scraper] Crawler failed for ${targetUrl}: ${error.message}`);
    return '';
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Main AI discovery scraping pipeline.
 */
export async function scrapeWithAI(params: ScrapeWithAIParams): Promise<ScrapedLead[]> {
  logger.info(`[Scraper] Executing search for source ${params.source} with terms: ${params.searchTerms.join(', ')}`);
  
  let query = '';
  const searchBase = params.searchTerms.map(t => `"${t}"`).join(' ');
  
  // Detect if target is Australia
  const isAustralia = !params.location || 
    /australia|nsw|vic|qld|wa|sa|tas|act|nt/i.test(params.location);

  // Normalize location constraint
  let locationConstraint = params.location ? ` "${params.location}"` : '';
  if (isAustralia && params.location && !/australia/i.test(params.location)) {
    locationConstraint += ' "Australia"';
  }

  switch (params.source) {
    case 'linkedin':
      const linkedinDomain = isAustralia ? 'au.linkedin.com/in/' : 'linkedin.com/in/';
      query = `site:${linkedinDomain} ${searchBase}${locationConstraint}`;
      break;
    case 'crunchbase':
      query = `site:crunchbase.com/organization/ ${searchBase}${locationConstraint}`;
      break;
    case 'news-articles':
      query = `${searchBase}${locationConstraint} (news OR funding OR hire OR press)${isAustralia ? ' site:.au' : ''}`;
      break;
    case 'company-websites':
    default:
      query = `${searchBase}${locationConstraint} website${isAustralia ? ' site:.au' : ''}`;
      break;
  }

  const searchResults = await searchDuckDuckGo(query, params.maxResults);
  const scrapedLeads: ScrapedLead[] = [];

  for (const result of searchResults) {
    try {
      let details = result.snippet;
      let companyName = 'Unknown Company';
      let personName = 'Unknown Lead';

      const titleParts = result.title.split(/[-|]/);
      if (titleParts.length > 0) {
        personName = titleParts[0].trim();
      }
      if (titleParts.length > 1) {
        companyName = titleParts[titleParts.length - 2].trim();
      }

      if (params.source === 'company-websites' && !result.url.includes('linkedin.com') && !result.url.includes('crunchbase.com')) {
        logger.info(`[Scraper] Found target website for crawling: ${result.url}`);
        const siteContent = await crawlWebsite(result.url);
        if (siteContent.trim().length > 100) {
          details = siteContent;
        }
        
        try {
          const parsedUrl = new URL(result.url);
          companyName = parsedUrl.hostname.replace('www.', '');
        } catch (e) {}
      }

      scrapedLeads.push({
        name: personName,
        company: { name: companyName, website: result.url },
        source: `Real Scraper (${params.source})`,
        details: `URL: ${result.url}\nSearch Snippet: ${result.snippet}\n\nSite Content:\n${details}`,
      });
    } catch (err: any) {
      logger.error(`[Scraper] Failed to process search result ${result.url}: ${err.message}`);
    }
  }

  return scrapedLeads;
}
