import { requestQueue } from './request-queue';
import { logger } from './logger';
import { SecurityUtils } from './security';
import { RetryStrategy } from './retry-strategy';
import { complianceManager } from './compliance';
import { getRandomUserAgent } from './user-agents';
import * as cheerio from 'cheerio';

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

// Rate limiter
class RateLimiter {
  private lastRequestTime = 0;
  private minDelay = 2000; // 2 seconds between requests

  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minDelay) {
      await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }
}

const rateLimiter = new RateLimiter();

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

function getRequestHeaders(referer?: string): Record<string, string> {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': referer || 'https://www.google.com/',
  };
}

/**
 * Perform a web search using Serper API (if key exists) or fallback to DuckDuckGo.
 */
export async function performWebSearch(query: string, maxResults: number): Promise<{ url: string; title: string; snippet: string }[]> {
  const serperApiKey = process.env.SERPER_API_KEY;
  
  return requestQueue.add(async () => {
    return RetryStrategy.withExponentialBackoff(async () => {
      await rateLimiter.wait();
      
      try {
        if (serperApiKey) {
          logger.info(`[Scraper] Searching Serper API for: "${query}"`);
          const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'X-API-KEY': serperApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ q: query, num: maxResults })
          });
          
          if (!response.ok) {
            throw new Error(`Serper API returned status ${response.status}`);
          }
          
          const data = await response.json();
          const results = (data.organic || []).map((r: any) => ({
            url: r.link,
            title: r.title || '',
            snippet: r.snippet || ''
          })).slice(0, maxResults);
          
          logger.info(`[Scraper] Found ${results.length} Serper results`);
          return results;
        }

        // Fallback to DuckDuckGo
        logger.info(`[Scraper] Searching DuckDuckGo for: "${query}"`);
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, {
          headers: getRequestHeaders('https://duckduckgo.com/'),
        });

        if (!response.ok) {
          throw new Error(`DuckDuckGo returned status ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        const items: { href: string; title: string; snippet: string }[] = [];
        
        $('.result').each((i, el) => {
          const a = $(el).find('.result__a');
          const snippetEl = $(el).find('.result__snippet');
          const href = a.attr('href');
          
          if (href) {
            items.push({
              href,
              title: a.text().trim() || '',
              snippet: snippetEl.text().trim() || '',
            });
          }
        });

        const parsedResults = items
          .map((r) => ({
            url: decodeDdgUrl(r.href),
            title: r.title,
            snippet: r.snippet
          }))
          .filter((r) => 
            r.url && 
            !r.url.includes('duckduckgo.com') && 
            !r.url.includes('google.com') &&
            SecurityUtils.validateUrl(r.url)
          )
          .slice(0, maxResults);

        logger.info(`[Scraper] Found ${parsedResults.length} DDG results`);
        return parsedResults;
      } catch (error: any) {
        logger.error(`[Scraper] Search failed: ${error.message}`);
        throw error; // Propagate for RetryStrategy
      }
    }, {
      maxRetries: 3,
      baseDelay: 2000,
    });
  });
}

/**
 * Crawls a target company website homepage and major sub-pages (About, Contact, etc.)
 * Extracts meta description, structured data, and text.
 */
export async function crawlWebsite(targetUrl: string): Promise<string> {
  if (!SecurityUtils.validateUrl(targetUrl)) {
    logger.warn(`[Scraper] Blocked crawl attempt for insecure or local URL: ${targetUrl}`);
    return '';
  }

  // Respect robots.txt compliance rules
  const compliance = await complianceManager.checkRobotsTxt(targetUrl);
  if (!compliance.allowed) {
    logger.warn(`[Scraper] Crawl aborted for compliance reasons: ${compliance.reason || 'Robots.txt constraint'}`);
    return '';
  }
  
  logger.info(`[Scraper] Starting deep crawl of: ${targetUrl}`);
  
  return requestQueue.add(async () => {
    try {
      // Respect Crawl-Delay if specified in robots.txt
      if (compliance.crawlDelay && compliance.crawlDelay > 0) {
        const delayMs = compliance.crawlDelay * 1000;
        logger.info(`[Scraper] Respecting robots.txt Crawl-Delay. Waiting ${delayMs}ms before fetch...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // 1. Crawl Homepage
      const response = await fetch(targetUrl, { 
        headers: getRequestHeaders(new URL(targetUrl).origin),
        signal: controller.signal as any
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Target returned status ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove script, style, etc. but keep application/ld+json script tags before stripping them
      const jsonLdScripts = $('script[type="application/ld+json"]')
        .map((i, el) => $(el).html())
        .get()
        .join('\n');

      $('script, style, noscript, iframe, svg, header, footer, nav').remove();

      const text = $('body').text().replace(/\s+/g, ' ').trim();
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      
      // Structured Data extraction: OpenGraph metadata (Priority 2)
      const ogTags: Record<string, string> = {};
      $('meta[property^="og:"]').each((i, el) => {
        const property = $(el).attr('property');
        const content = $(el).attr('content');
        if (property && content) {
          ogTags[property] = content;
        }
      });

      // Extract emails, phones, and social links locally using Cheerio
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      const emails = Array.from(new Set(text.match(emailRegex) || []));
      const phones = Array.from(new Set(text.match(phoneRegex) || []));

      const socialLinks: Record<string, string> = {};
      const links = $('a')
        .map((i, el) => ({ href: $(el).attr('href'), text: $(el).text().trim() }))
        .get()
        .filter(l => l.href && l.href.startsWith('http'));

      links.forEach(l => {
        if (l.href) {
          if (l.href.includes('linkedin.com')) socialLinks.linkedin = l.href;
          if (l.href.includes('twitter.com') || l.href.includes('x.com')) socialLinks.twitter = l.href;
          if (l.href.includes('facebook.com')) socialLinks.facebook = l.href;
        }
      });

      let combinedText = '';
      if (jsonLdScripts) {
        combinedText += `[STRUCTURED JSON-LD]\n${jsonLdScripts.substring(0, 8000)}\n\n`;
      }
      if (Object.keys(ogTags).length > 0) {
        combinedText += `[OPEN GRAPH METADATA]\n${JSON.stringify(ogTags)}\n\n`;
      }
      if (emails.length > 0) {
        combinedText += `[LOCAL EMAILS FOUND]\n${emails.join(', ')}\n\n`;
      }
      if (phones.length > 0) {
        combinedText += `[LOCAL PHONES FOUND]\n${phones.join(', ')}\n\n`;
      }
      if (Object.keys(socialLinks).length > 0) {
        combinedText += `[SOCIAL LINKS FOUND]\n${JSON.stringify(socialLinks)}\n\n`;
      }
      combinedText += `[META DESCRIPTION]\n${metaDescription}\n\n`;
      combinedText += `[HOMEPAGE CONTENT]\n${text}\n\n`;

      // 2. Discover high-yield subpages (About, Contact, Team)
      const targetKeywords = ['about', 'contact', 'team', 'staff'];
      const origin = new URL(targetUrl).origin;
      
      const subpageUrls = Array.from(
        new Set(
          links
            .map(l => l.href)
            .filter(href => {
              if (!href) return false;
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
      ).slice(0, 2) as string[]; 

      for (const subpageUrl of subpageUrls) {
        if (!subpageUrl) continue;
        try {
          logger.info(`[Scraper] Crawling subpage: ${subpageUrl}`);
          const subController = new AbortController();
          const subTimeout = setTimeout(() => subController.abort(), 10000);
          
          const subRes = await fetch(subpageUrl, { 
            headers: getRequestHeaders(origin),
            signal: subController.signal as any
          });
          clearTimeout(subTimeout);

          if (subRes.ok) {
            const subHtml = await subRes.text();
            const $sub = cheerio.load(subHtml);
            $sub('script, style, noscript, iframe, svg, header, footer, nav').remove();
            const subpageText = $sub('body').text().replace(/\s+/g, ' ').trim();
            combinedText += `[SUBPAGE CONTENT: ${subpageUrl}]\n${subpageText}\n\n`;
          }
        } catch (e: any) {
          logger.warn(`[Scraper] Failed to crawl subpage ${subpageUrl}: ${e.message}`);
        }
      }

      return combinedText.substring(0, 40000); 
    } catch (error: any) {
      logger.error(`[Scraper] Crawler failed for ${targetUrl}: ${error.message}`);
      return '';
    }
  });

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

  const searchResults = await performWebSearch(query, params.maxResults);
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
